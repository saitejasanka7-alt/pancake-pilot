import { GoogleGenAI, Type } from '@google/genai';
import type { Request, Response } from 'express';
import { formatMoney } from '../src/shared/currencies.ts';
import { aiPromptSchema } from '../src/shared/schemas.ts';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function handlePipAIAsk(req: Request, res: Response): Promise<void> {
  const parsed = aiPromptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid AI prompt payload.',
    });
    return;
  }

  const { question, reportingCurrency, anonymizeMerchants, contextSummary } = parsed.data;
  const ai = getGeminiClient();

  if (!ai) {
    res.status(200).json({
      mode: 'offline_fallback',
      modelUsed: null,
      fallbackReason:
        'GEMINI_API_KEY is not configured on the server. Displaying deterministic local financial analysis.',
    });
    return;
  }

  const sanitizedTransactions = contextSummary.recentNotableTransactions.map((t, idx) => ({
    date: t.date,
    label: anonymizeMerchants ? `Merchant #${idx + 1}` : t.label,
    category: t.category,
    amount: t.amount,
    scope: t.scope,
    type: t.type,
  }));

  const deterministicContext = {
    reportingCurrency,
    totalBalance: formatMoney(contextSummary.totalBalance, reportingCurrency),
    thisMonthIncome: formatMoney(contextSummary.thisMonthIncome, reportingCurrency),
    thisMonthExpenses: formatMoney(contextSummary.thisMonthExpenses, reportingCurrency),
    lastMonthExpenses: formatMoney(contextSummary.lastMonthExpenses, reportingCurrency),
    monthOverMonthDiff: formatMoney(
      contextSummary.thisMonthExpenses - contextSummary.lastMonthExpenses,
      reportingCurrency,
      { showSign: true }
    ),
    savingsRatePct: `${contextSummary.savingsRatePct}%`,
    personalExpenses: formatMoney(contextSummary.personalExpenses, reportingCurrency),
    businessExpenses: formatMoney(contextSummary.businessExpenses, reportingCurrency),
    predictedNextMonth: formatMoney(contextSummary.predictedNextMonth, reportingCurrency),
    topCategories: contextSummary.topCategories,
    budgets: contextSummary.budgets,
    subscriptionsMonthlyTotal: formatMoney(
      contextSummary.subscriptionsMonthlyTotal,
      reportingCurrency
    ),
    topSubscriptions: contextSummary.topSubscriptions,
    notableTransactions: sanitizedTransactions,
  };

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `User question: "${question}"\n\nVerified financial metrics (all figures already computed deterministically from the user's ledger in ${reportingCurrency}):\n${JSON.stringify(deterministicContext, null, 2)}`,
      config: {
        systemInstruction:
          'You are Pip, the personal & business finance copilot inside PancakePilot AI. Answer the user concisely and practically using ONLY the verified deterministic numbers provided. Never invent transactions or alter totals. Return structured JSON matching the schema so the UI can render an actionable insight card.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Clear 2-4 sentence conversational explanation answering the user directly.',
            },
            headline: {
              type: Type.STRING,
              description: 'Short 3-7 word insight card title with key figure.',
            },
            differenceLabel: {
              type: Type.STRING,
              description: 'Optional comparison delta line if relevant.',
            },
            recommendedAction: {
              type: Type.STRING,
              description: 'One concrete next step the user can take.',
            },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                },
              },
            },
            relatedCategoryName: {
              type: Type.STRING,
              description: 'Optional category name from topCategories to filter transactions if relevant.',
            },
            relatedScope: {
              type: Type.STRING,
              description: 'Optional: personal or business if the question focuses on one.',
            },
          },
          required: ['reply', 'headline', 'recommendedAction'],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const structured = JSON.parse(rawText) as {
      reply: string;
      headline: string;
      differenceLabel?: string;
      recommendedAction?: string;
      breakdown?: { label: string; value: number }[];
      relatedCategoryName?: string;
      relatedScope?: string;
    };

    res.json({
      mode: 'gemini',
      modelUsed: GEMINI_MODEL,
      reply: structured.reply,
      insightCard: {
        headline: structured.headline,
        differenceLabel: structured.differenceLabel,
        breakdown: structured.breakdown,
        recommendedAction: structured.recommendedAction,
      },
      relatedCategoryName: structured.relatedCategoryName,
      relatedScope: structured.relatedScope,
    });
  } catch (err) {
    res.status(200).json({
      mode: 'offline_fallback',
      modelUsed: null,
      fallbackReason:
        err instanceof Error
          ? `Gemini service unavailable (${err.message}). Showing verified local calculations.`
          : 'Gemini service unavailable. Showing verified local calculations.',
    });
  }
}

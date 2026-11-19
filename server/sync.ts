import type { Request, Response } from 'express';
import type { FinanceDataset } from '../src/shared/types.ts';
import { getAuthenticatedUser } from './auth.ts';
import { readDb, writeDb } from './db.ts';

function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(
  serverList: T[],
  clientList: T[]
): { merged: T[]; conflictsResolved: number } {
  const map = new Map<string, T>();
  let conflictsResolved = 0;

  for (const item of serverList) {
    map.set(item.id, item);
  }
  for (const item of clientList) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else if (item.updatedAt > existing.updatedAt) {
      map.set(item.id, item);
      conflictsResolved += 1;
    } else if (existing.updatedAt > item.updatedAt) {
      conflictsResolved += 1;
    }
  }

  return { merged: Array.from(map.values()), conflictsResolved };
}

export function handleGetCloudDataset(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required for cloud sync.' });
    return;
  }
  const db = readDb();
  const dataset = db.userDatasets[user.id] ?? null;
  res.json({ ok: true, dataset });
}

export function handleSyncDataset(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required for cloud sync.' });
    return;
  }

  const clientDataset = req.body?.dataset as FinanceDataset | undefined;
  if (!clientDataset || typeof clientDataset !== 'object') {
    res.status(400).json({ error: 'Missing dataset payload for synchronisation.' });
    return;
  }

  const db = readDb();
  const serverDataset = db.userDatasets[user.id];
  const nowIso = new Date().toISOString();

  if (!serverDataset) {
    const saved: FinanceDataset = {
      ...clientDataset,
      profile: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarInitials: user.fullName
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        createdAt: user.createdAt,
      },
      lastSyncedAt: nowIso,
    };
    db.userDatasets[user.id] = saved;
    writeDb(db);
    res.json({ ok: true, dataset: saved, conflictsResolved: 0 });
    return;
  }

  const txMerge = mergeByUpdatedAt(serverDataset.transactions, clientDataset.transactions);
  const catMerge = mergeByUpdatedAt(serverDataset.categories, clientDataset.categories);
  const panelMerge = mergeByUpdatedAt(serverDataset.panels, clientDataset.panels);
  const accMerge = mergeByUpdatedAt(serverDataset.accounts, clientDataset.accounts);
  const trMerge = mergeByUpdatedAt(serverDataset.transfers, clientDataset.transfers);
  const budMerge = mergeByUpdatedAt(serverDataset.budgets, clientDataset.budgets);
  const goalMerge = mergeByUpdatedAt(serverDataset.goals, clientDataset.goals);
  const subMerge = mergeByUpdatedAt(serverDataset.subscriptions, clientDataset.subscriptions);
  const grpMerge = mergeByUpdatedAt(serverDataset.groups, clientDataset.groups);
  const chMerge = mergeByUpdatedAt(serverDataset.challenges, clientDataset.challenges);

  const totalConflicts =
    txMerge.conflictsResolved +
    budMerge.conflictsResolved +
    accMerge.conflictsResolved +
    goalMerge.conflictsResolved;

  const merged: FinanceDataset = {
    version: Math.max(serverDataset.version, clientDataset.version),
    profile: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarInitials: user.fullName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      createdAt: user.createdAt,
    },
    preferences: clientDataset.preferences ?? serverDataset.preferences,
    categories: catMerge.merged,
    panels: panelMerge.merged,
    accounts: accMerge.merged,
    transfers: trMerge.merged,
    transactions: txMerge.merged,
    budgets: budMerge.merged,
    goals: goalMerge.merged,
    subscriptions: subMerge.merged,
    groups: grpMerge.merged,
    challenges: chMerge.merged,
    notifications: clientDataset.notifications ?? serverDataset.notifications,
    conversations:
      clientDataset.conversations.length >= serverDataset.conversations.length
        ? clientDataset.conversations
        : serverDataset.conversations,
    lastSyncedAt: nowIso,
  };

  db.userDatasets[user.id] = merged;
  writeDb(db);

  res.json({
    ok: true,
    dataset: merged,
    conflictsResolved: totalConflicts,
  });
}

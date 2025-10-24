import { z } from "zod";

export const Choice = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
  mediaRef: z.string().optional(),
  alt: z.string().optional(),
});

export const Question = z.object({
  id: z.string().min(1),
  objective: z.string().min(1),
  stem: z.string().min(1),
  vignette: z.string().optional(),
  choices: z.array(Choice).min(2),
  explanation: z.string().min(1),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(["easy","med","hard"]).default("med"),
  references: z.array(z.string()).default([]),
  mediaBundle: z.array(z.string()).default([]),
  offlineRequired: z.boolean().default(false),
});

export type QuestionT = z.infer<typeof Question>;

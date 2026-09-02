import { supabase } from "@/integrations/supabase/client";

export const DEMO_QUIZ_ID = "20000000-0000-4000-8000-000000000001";

export type QuizSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  slideCount: number;
  questionCount: number;
  pageCount: number;
  fileName: string | null;
};

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getQuizSummaries(ownerId: string) {
  const { data: quizzes, error } = await supabase.from("quizzes").select("id,title,description,status,created_at,presentation_id").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw error;
  const summaries = await Promise.all((quizzes ?? []).map(async (quiz) => {
    const [{ data: slides }, { data: presentation }, { data: questions }] = await Promise.all([
      supabase.from("slides").select("id").eq("quiz_id", quiz.id),
      quiz.presentation_id ? supabase.from("presentations").select("page_count,original_file_name").eq("id", quiz.presentation_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("slides").select("id,question_metadata(slide_id)").eq("quiz_id", quiz.id).eq("slide_type", "quiz"),
    ]);
    return { ...quiz, slideCount: slides?.length ?? 0, questionCount: questions?.length ?? 0, pageCount: presentation?.page_count ?? 0, fileName: presentation?.original_file_name ?? null } satisfies QuizSummary;
  }));
  return summaries;
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function createRoom(quizId: string, ownerId: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.from("rooms").insert({ quiz_id: quizId, owner_id: ownerId, room_code: makeRoomCode() }).select("id,room_code").single();
    if (!error && data) return data;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

export async function createQuizFromPdf(file: File, ownerId: string) {
  if (file.type !== "application/pdf") throw new Error("Please choose a PDF file.");
  const path = `${ownerId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await supabase.storage.from("presentation-files").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw uploadError;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  const detectedPages = text.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 1;
  const pageCount = Math.max(1, detectedPages);
  const title = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled quiz";
  const { data: presentation, error: presentationError } = await supabase.from("presentations").insert({ owner_id: ownerId, title, original_file_name: file.name, original_file_path: path, page_count: pageCount, processing_status: "ready" }).select("id").single();
  if (presentationError || !presentation) throw presentationError ?? new Error("Could not create presentation.");
  const { data: quiz, error: quizError } = await supabase.from("quizzes").insert({ owner_id: ownerId, presentation_id: presentation.id, title: title.toUpperCase(), status: "draft" }).select("id").single();
  if (quizError || !quiz) throw quizError ?? new Error("Could not create quiz.");
  const slides = Array.from({ length: pageCount }, (_, index) => ({ quiz_id: quiz.id, slide_number: index + 1, page_number: index + 1, slide_type: "normal" as const }));
  const { error: slidesError } = await supabase.from("slides").insert(slides);
  if (slidesError) throw slidesError;
  return quiz.id;
}
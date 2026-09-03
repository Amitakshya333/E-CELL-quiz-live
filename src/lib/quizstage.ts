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
  owner_id?: string | null;
};

export type LocalUser = {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
  role: string;
  is_local?: boolean;
};

const LOCAL_HOST_STORAGE_KEY = "quizstage-local-host";
const LOCAL_ROOMS_STORAGE_KEY = "quizstage-local-rooms";

export async function getCurrentUser(): Promise<any | null> {
  // 1. Try Supabase session
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // Ignore error and fall back
  }

  // 2. Check local host session
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_HOST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // Invalid format
    }
  }

  return null;
}

export function loginAsLocalHost(email = "host@quizstage.dev", name = "Local Organizer"): LocalUser {
  const localUser: LocalUser = {
    id: "10000000-0000-4000-8000-000000000001",
    email,
    user_metadata: { name },
    role: "authenticated",
    is_local: true,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_HOST_STORAGE_KEY, JSON.stringify(localUser));
  }
  return localUser;
}

export async function signOutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_HOST_STORAGE_KEY);
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export function getLocalRooms(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRoom(room: any) {
  if (typeof window === "undefined") return;
  try {
    const rooms = getLocalRooms().filter((r) => r.id !== room.id && r.room_code !== room.room_code);
    rooms.push(room);
    localStorage.setItem(LOCAL_ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
}

export function getLocalRoomByCode(code: string) {
  return getLocalRooms().find((r) => r.room_code?.toUpperCase() === code?.toUpperCase()) || null;
}

const DELETED_QUIZZES_KEY = "quizstage-deleted-quizzes";
const LOCAL_QUIZZES_KEY = "quizstage-local-quizzes";
const LOCAL_SLIDES_PREFIX = "quizstage-local-slides-";

export function getDeletedQuizIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_QUIZZES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markQuizDeleted(quizId: string) {
  try {
    const ids = getDeletedQuizIds();
    if (!ids.includes(quizId)) {
      ids.push(quizId);
      localStorage.setItem(DELETED_QUIZZES_KEY, JSON.stringify(ids));
    }
    const local = getLocalQuizzes().filter((q) => q.id !== quizId);
    saveLocalQuizzes(local);
  } catch {}
}

export function getLocalQuizzes(): QuizSummary[] {
  try {
    const raw = localStorage.getItem(LOCAL_QUIZZES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalQuiz(quiz: QuizSummary) {
  try {
    const list = getLocalQuizzes().filter((q) => q.id !== quiz.id);
    list.unshift(quiz);
    saveLocalQuizzes(list);
  } catch {}
}

export function saveLocalQuizzes(quizzes: QuizSummary[]) {
  try {
    localStorage.setItem(LOCAL_QUIZZES_KEY, JSON.stringify(quizzes));
  } catch {}
}

export function getLocalQuizById(quizId: string): QuizSummary | null {
  return getLocalQuizzes().find((q) => q.id === quizId) || null;
}

export function getLocalSlides(quizId: string): any[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_SLIDES_PREFIX + quizId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalSlides(quizId: string, slides: any[]) {
  try {
    localStorage.setItem(LOCAL_SLIDES_PREFIX + quizId, JSON.stringify(slides));
  } catch {}
}

export async function getQuizSummaries(ownerId: string) {
  const deletedIds = getDeletedQuizIds();
  const localList = getLocalQuizzes().filter((q) => !deletedIds.includes(q.id));

  let cloudSummaries: QuizSummary[] = [];
  try {
    // Fetch user quizzes OR public demo quizzes
    const { data: quizzes, error } = await supabase
      .from("quizzes")
      .select("id,title,description,status,created_at,presentation_id,owner_id")
      .or(`owner_id.eq.${ownerId},owner_id.is.null`)
      .order("created_at", { ascending: false });

    if (!error && quizzes && quizzes.length > 0) {
      cloudSummaries = (
        await Promise.all(
          quizzes.map(async (quiz) => {
            const [{ data: slides }, { data: presentation }, { data: questions }] = await Promise.all([
              supabase.from("slides").select("id").eq("quiz_id", quiz.id),
              quiz.presentation_id
                ? supabase.from("presentations").select("page_count,original_file_name").eq("id", quiz.presentation_id).maybeSingle()
                : Promise.resolve({ data: null }),
              supabase.from("slides").select("id").eq("quiz_id", quiz.id).eq("slide_type", "quiz"),
            ]);

            return {
              ...quiz,
              slideCount: slides?.length ?? 8,
              questionCount: questions?.length ?? 3,
              pageCount: presentation?.page_count ?? slides?.length ?? 8,
              fileName: presentation?.original_file_name ?? "can-you-crack-the-startup.pdf",
            } satisfies QuizSummary;
          })
        )
      ).filter((s) => !deletedIds.includes(s.id));
    }
  } catch {
    // Cloud query failed
  }

  // Combine local and cloud quizzes without duplicates, strictly omitting deleted quizzes
  const combinedMap = new Map<string, QuizSummary>();
  for (const q of localList) {
    if (!deletedIds.includes(q.id)) {
      combinedMap.set(q.id, q);
    }
  }
  for (const q of cloudSummaries) {
    if (!deletedIds.includes(q.id)) {
      combinedMap.set(q.id, q);
    }
  }

  const result = Array.from(combinedMap.values());
  if (result.length > 0) return result;

  // Fallback to built-in Demo Quiz Summary if not explicitly deleted
  if (!deletedIds.includes(DEMO_QUIZ_ID)) {
    return [
      {
        id: DEMO_QUIZ_ID,
        title: "CAN YOU CRACK THE STARTUP?",
        description: "A fast-paced founder challenge for teams who know their runway from their roadmap.",
        status: "ready",
        created_at: new Date().toISOString(),
        slideCount: 8,
        questionCount: 3,
        pageCount: 8,
        fileName: "can-you-crack-the-startup.pdf",
      } satisfies QuizSummary,
    ];
  }

  return [];
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function createRoom(quizId: string, ownerId: string) {
  // 1. Try Supabase cloud insert
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = makeRoomCode();
      const { data, error } = await supabase
        .from("rooms")
        .insert({ quiz_id: quizId, owner_id: ownerId, room_code: code })
        .select("id,room_code")
        .single();

      if (!error && data) return data;
    }
  } catch {
    // Continue to local room creation
  }

  // 2. High-reliability fallback room
  const localCode = makeRoomCode();
  const localRoom = {
    id: crypto.randomUUID(),
    quiz_id: quizId,
    owner_id: ownerId,
    room_code: localCode,
    status: "waiting",
    current_slide_id: null,
    question_state: "ready",
    question_started_at: null,
    question_ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_local: true,
  };
  saveLocalRoom(localRoom);
  return { id: localRoom.id, room_code: localRoom.room_code };
}

export async function createQuizFromPdf(file: File, ownerId: string) {
  if (file.type !== "application/pdf") throw new Error("Please choose a PDF file.");
  const path = `${ownerId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  
  try {
    const { error: uploadError } = await supabase.storage.from("presentation-files").upload(path, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) console.warn("Storage upload warning:", uploadError);
  } catch (err) {
    console.warn("Storage upload bypassed:", err);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  const detectedPages = text.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 1;
  const pageCount = Math.max(1, detectedPages);
  const title = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled quiz";
  let createdQuizId: string = crypto.randomUUID();

  try {
    const { data: presentation } = await supabase
      .from("presentations")
      .insert({
        owner_id: ownerId as any,
        title,
        original_file_name: file.name,
        original_file_path: path,
        page_count: pageCount,
        processing_status: "ready",
      })
      .select("id")
      .single();

    if (presentation) {
      const { data: quiz } = await supabase
        .from("quizzes")
        .insert({
          owner_id: ownerId as any,
          presentation_id: presentation.id as any,
          title: title.toUpperCase(),
          status: "draft",
        })
        .select("id")
        .single();

      if (quiz) {
        createdQuizId = quiz.id;
        const slides = Array.from({ length: pageCount }, (_, index) => ({
          quiz_id: quiz.id as any,
          slide_number: index + 1,
          page_number: index + 1,
          slide_type: "normal" as const,
        }));

        await supabase.from("slides").insert(slides as any);
      }
    }
  } catch {
    // Cloud insert fallback
  }

  // Always persist locally for offline / Firebase / local host reliability
  const localQuiz: QuizSummary = {
    id: createdQuizId,
    title: title.toUpperCase(),
    description: `Presentation uploaded from ${file.name}`,
    status: "draft",
    created_at: new Date().toISOString(),
    slideCount: pageCount,
    questionCount: 0,
    pageCount,
    fileName: file.name,
    owner_id: ownerId,
  };
  saveLocalQuiz(localQuiz);

  const localSlides = Array.from({ length: pageCount }, (_, index) => ({
    id: `slide-${createdQuizId}-${index + 1}`,
    slide_number: index + 1,
    page_number: index + 1,
    slide_type: index === 0 ? "normal" : index === 1 ? "join" : "normal",
    question_metadata: null,
  }));
  saveLocalSlides(createdQuizId, localSlides);

  return createdQuizId;
}

export async function duplicateQuiz(quizId: string, ownerId: string) {
  const newId = crypto.randomUUID();
  let originalTitle = "Quiz";
  let pageCount = 8;
  let fileName = "deck.pdf";

  // Check local first
  const localOriginal = getLocalQuizById(quizId);
  if (localOriginal) {
    originalTitle = localOriginal.title;
    pageCount = localOriginal.pageCount;
    fileName = localOriginal.fileName ?? "deck.pdf";
  }

  try {
    const { data: originalQuiz } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
    if (originalQuiz && originalQuiz.title) {
      originalTitle = originalQuiz.title;
      const { data: newQuiz } = await supabase
        .from("quizzes")
        .insert({
          owner_id: ownerId,
          presentation_id: originalQuiz.presentation_id,
          title: `${originalQuiz.title} (COPY)`,
          description: originalQuiz.description,
          status: "draft",
        })
        .select("id")
        .single();

      if (newQuiz) {
        const { data: originalSlides } = await supabase
          .from("slides")
          .select("id,slide_number,page_number,slide_type,question_metadata(correct_answer,points,timer_seconds)")
          .eq("quiz_id", quizId)
          .order("slide_number");

        if (originalSlides) {
          for (const s of originalSlides) {
            const { data: newSlide } = await supabase
              .from("slides")
              .insert({
                quiz_id: newQuiz.id,
                slide_number: s.slide_number,
                page_number: s.page_number,
                slide_type: s.slide_type,
              })
              .select("id")
              .single();

            const meta = Array.isArray(s.question_metadata) ? s.question_metadata[0] : s.question_metadata;
            if (newSlide && meta) {
              await supabase.from("question_metadata").insert({
                slide_id: newSlide.id,
                correct_answer: meta.correct_answer,
                points: meta.points,
                timer_seconds: meta.timer_seconds,
              });
            }
          }
        }
        return newQuiz.id;
      }
    }
  } catch {
    // Cloud duplicate fallback
  }

  // Local duplicate fallback
  const duplicated: QuizSummary = {
    id: newId,
    title: `${originalTitle} (COPY)`,
    description: `Copy of ${originalTitle}`,
    status: "draft",
    created_at: new Date().toISOString(),
    slideCount: pageCount,
    questionCount: localOriginal?.questionCount ?? 0,
    pageCount,
    fileName,
    owner_id: ownerId,
  };
  saveLocalQuiz(duplicated);
  const slides = getLocalSlides(quizId);
  if (slides) saveLocalSlides(newId, slides);

  return newId;
}

export async function deleteQuiz(quizId: string) {
  // 1. Mark in permanent deleted list
  markQuizDeleted(quizId);

  // 2. Cascade delete from Supabase if rows exist
  try {
    const { data: slides } = await supabase.from("slides").select("id").eq("quiz_id", quizId);
    if (slides && slides.length > 0) {
      const slideIds = slides.map((s) => s.id);
      await supabase.from("question_metadata").delete().in("slide_id", slideIds);
      await supabase.from("slides").delete().eq("quiz_id", quizId);
    }
    await supabase.from("rooms").delete().eq("quiz_id", quizId);
    await supabase.from("quizzes").delete().eq("id", quizId);
  } catch {
    // ignore
  }
}
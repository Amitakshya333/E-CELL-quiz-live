import { supabase } from "@/integrations/supabase/client";
import {
  createRoomInFirebase,
  getQuizzesFromFirebase,
  saveQuizInFirebase,
  getCanonicalStartupDeck,
  type FirebaseSlide,
} from "./firebase-quiz";

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
  // 1. Check Firebase Auth session
  if (typeof window !== "undefined") {
    try {
      const { auth } = await import("@/integrations/firebase/client");
      if (auth.currentUser) {
        return {
          id: auth.currentUser.uid,
          email: auth.currentUser.email,
          user_metadata: {
            name: auth.currentUser.displayName || "E-Cell Host",
            avatar_url: auth.currentUser.photoURL,
          },
          role: "authenticated",
        };
      }
    } catch {
      // ignore
    }
  }

  // 2. Try Supabase session
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // Ignore error and fall back
  }

  // 3. Check local host session
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

export function loginAsLocalHost(email = "host@ecell.suiit.ac.in", name = "E-Cell Organizer"): LocalUser {
  const localUser: LocalUser = {
    id: "10000000-0000-4000-8000-000000000001",
    email,
    user_metadata: { name },
    role: "authenticated",
    is_local: true,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_HOST_STORAGE_KEY, JSON.stringify(localUser));
    } catch {}
  }
  return localUser;
}

export async function signOutUser(): Promise<void> {
  try {
    const { signOutFirebase } = await import("@/integrations/firebase/client");
    await signOutFirebase();
  } catch {}

  try {
    await supabase.auth.signOut();
  } catch {}

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_HOST_STORAGE_KEY);
    } catch {}
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
    const fbQuizzes = await getQuizzesFromFirebase(ownerId);
    if (fbQuizzes && fbQuizzes.length > 0) {
      cloudSummaries = fbQuizzes.map((fq) => ({
        id: fq.id,
        title: fq.title,
        description: fq.description,
        status: fq.status,
        created_at: fq.created_at,
        slideCount: fq.slide_count,
        questionCount: fq.question_count,
        pageCount: fq.page_count,
        fileName: fq.file_name || null,
        owner_id: fq.owner_id,
      }));
    }
  } catch (err) {
    console.warn("Firebase quiz summary error:", err);
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
  // 1. Authoritative Firebase Firestore room creation
  try {
    const localQuiz = getLocalQuizById(quizId);
    const localSlides = getLocalSlides(quizId);
    const title = localQuiz?.title || (quizId === DEMO_QUIZ_ID ? "CAN YOU CRACK THE STARTUP?" : "Live Quiz");

    const firebaseRoom = await createRoomInFirebase(quizId, ownerId, title, localSlides || undefined);
    saveLocalRoom(firebaseRoom);
    return { id: firebaseRoom.room_code, room_code: firebaseRoom.room_code };
  } catch (err) {
    console.warn("Firebase room creation error, falling back to local:", err);
  }

  // 2. High-reliability fallback room
  const localCode = makeRoomCode();
  const localRoom = {
    id: localCode,
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
    slide_type: index === 0 ? ("normal" as const) : index === 1 ? ("join" as const) : ("normal" as const),
    question_metadata: null,
  }));
  saveLocalSlides(createdQuizId, localSlides);

  try {
    await saveQuizInFirebase({
      id: createdQuizId,
      title: title.toUpperCase(),
      description: `Presentation uploaded from ${file.name}`,
      owner_id: ownerId,
      slides: localSlides as any,
      file_name: file.name,
    });
  } catch (err) {
    console.warn("Could not sync quiz to Firebase Firestore:", err);
  }

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
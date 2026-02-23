import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Trainee {
  id: string;
  name: string;
  email: string;
  qualifications: string;
  university: string;
  cnic: string;
  reason: string;
  role: "trainee";
  enrolledCourses: number[];
  courseProgress: Record<number, number>;
  completedModules: Record<number, number[]>;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  role: "admin";
}

type User = Trainee | Admin;

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  sendTraineeCredentialsEmail: (email: string) => Promise<{ ok: boolean; reason?: string }>;
  signup: (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">) => Promise<boolean>;
  updateProfile: (data: {
    name: string;
    email: string;
    qualifications?: string;
    university?: string;
    reason?: string;
  }) => Promise<boolean>;
  logout: () => void;
  enrollInCourse: (courseId: number) => Promise<void>;
  updateCourseProgress: (courseId: number, progress: number) => Promise<void>;
  updateCompletedModules: (courseId: number, moduleId: number) => Promise<void>;
  getAllTrainees: () => Promise<Trainee[]>;
  deleteTrainee: (traineeId: string) => Promise<void>;
  addTrainee: (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_CREDENTIALS = {
  name: "Shahnawaz",
  email: "shanu1998end@gmail.com",
};

const SUPABASE_URL = "https://fylvxupxzwuzxdbyvzoq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bHZ4dXB4end1enhkYnl2em9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDI5NzEsImV4cCI6MjA3MjA3ODk3MX0.wGs6f6vQwH3EaYQvn1mBcx0R8UJ6F4aVvvrTjvYQ2mA";
const COE_TABLE = "coe_trainees";

const SUPABASE_HEADERS: HeadersInit = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const DEFAULT_RECOVERY_EMAILJS_CONFIG = {
  serviceId: "service_0kiqxra",
  templateId: "template_4uniopo",
  publicKey: "25iaOSGu9AvtiAydP",
  fromName: "NDMA COE Training Portal",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("ndma_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const mapTraineeFromDb = (record: any): Trainee => ({
    id: record.id,
    name: record.name || "",
    email: record.email || "",
    qualifications: record.qualifications || "",
    university: record.university || "",
    cnic: record.cnic || "",
    reason: record.reason || "",
    role: "trainee",
    enrolledCourses: Array.isArray(record.enrolled_courses) ? record.enrolled_courses : [],
    courseProgress:
      record.course_progress && typeof record.course_progress === "object" ? record.course_progress : {},
    completedModules:
      record.completed_modules && typeof record.completed_modules === "object" ? record.completed_modules : {},
  });

  const persistSessionUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem("ndma_user", JSON.stringify(nextUser));
  };

  const updateTraineeRecord = async (traineeId: string, payload: Record<string, unknown>) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${COE_TABLE}?id=eq.${encodeURIComponent(traineeId)}`,
      {
        method: "PATCH",
        headers: {
          ...SUPABASE_HEADERS,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update trainee (${response.status})`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("No trainee record returned after update");
    }

    return mapTraineeFromDb(rows[0]);
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (email === ADMIN_CREDENTIALS.email) {
      const adminUser: Admin = {
        id: "admin-1",
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email,
        role: "admin",
      };
      persistSessionUser(adminUser);
      return true;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${COE_TABLE}?select=*&email=eq.${encodeURIComponent(email)}&limit=1`,
        {
          headers: SUPABASE_HEADERS,
        },
      );

      if (!response.ok) {
        return false;
      }

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return false;
      }

      const normalizedProvidedCnic = String(password ?? "").replace(/-/g, "").trim();
      const normalizedStoredCnic = String(rows[0]?.cnic ?? "").replace(/-/g, "").trim();

      if (!normalizedProvidedCnic || normalizedProvidedCnic !== normalizedStoredCnic) {
        return false;
      }

      const trainee = mapTraineeFromDb(rows[0]);
      persistSessionUser(trainee);
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (
    data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">,
  ): Promise<boolean> => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        qualifications: data.qualifications,
        university: data.university,
        cnic: data.cnic,
        reason: data.reason,
        role: "trainee",
        enrolled_courses: [],
        course_progress: {},
        completed_modules: {},
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/${COE_TABLE}`, {
        method: "POST",
        headers: {
          ...SUPABASE_HEADERS,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return false;
      }

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return false;
      }

      const newTrainee = mapTraineeFromDb(rows[0]);
      persistSessionUser(newTrainee);
      return true;
    } catch {
      return false;
    }
  };

  const getRecoveryEmailConfig = () => {
    const serviceId = DEFAULT_RECOVERY_EMAILJS_CONFIG.serviceId.trim();
    const templateId = DEFAULT_RECOVERY_EMAILJS_CONFIG.templateId.trim();
    const publicKey = DEFAULT_RECOVERY_EMAILJS_CONFIG.publicKey.trim();
    const fromName = DEFAULT_RECOVERY_EMAILJS_CONFIG.fromName.trim();

    return { serviceId, templateId, publicKey, fromName };
  };

  const sendRecoveryEmail = async (trainee: Trainee): Promise<{ ok: boolean; reason?: string }> => {
    const config = getRecoveryEmailConfig();
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      return { ok: false, reason: "missing-config" };
    }

    const payload = {
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      template_params: {
        to_email: trainee.email,
        email: trainee.email,
        user_email: trainee.email,
        to_name: trainee.name,
        role: trainee.role,
        username: trainee.email,
        password: trainee.cnic,
        cnic: trainee.cnic,
        from_name: config.fromName,
        from: config.fromName,
        portal_name: "NDMA COE Training Portal",
        message: `Email: ${trainee.email} | CNIC: ${trainee.cnic}`,
      },
    };

    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        return { ok: false, reason: `api-failed:${response.status}:${responseText.slice(0, 160)}` };
      }

      return { ok: true };
    } catch {
      return { ok: false, reason: "network-error" };
    }
  };

  const sendTraineeCredentialsEmail = async (email: string): Promise<{ ok: boolean; reason?: string }> => {
    const normalizedEmail = String(email ?? "").trim();
    if (!normalizedEmail) {
      return { ok: false, reason: "missing-email" };
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${COE_TABLE}?select=*&email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`,
        {
          headers: SUPABASE_HEADERS,
        },
      );

      if (!response.ok) {
        return { ok: false, reason: "lookup-failed" };
      }

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: false, reason: "not-found" };
      }

      const trainee = mapTraineeFromDb(rows[0]);
      const sendResult = await sendRecoveryEmail(trainee);
      if (sendResult.ok) {
        return sendResult;
      }

      const subject = encodeURIComponent("COE Portal - Credential Recovery");
      const body = encodeURIComponent(
        `Assalam-o-Alaikum,\n\n` +
          `Your COE portal credentials are:\n` +
          `Email: ${trainee.email}\n` +
          `Password/Credential: ${trainee.cnic}\n\n` +
          `NDMA COE Training Portal`
      );
      window.location.href = `mailto:${encodeURIComponent(trainee.email)}?subject=${subject}&body=${body}`;

      return { ok: false, reason: `fallback-opened:${sendResult.reason || 'email-api-failed'}` };
    } catch {
      return { ok: false, reason: "network-error" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ndma_user");
  };

  const updateProfile = async (data: {
    name: string;
    email: string;
    qualifications?: string;
    university?: string;
    reason?: string;
  }): Promise<boolean> => {
    if (!user) return false;

    if (user.role === "admin") {
      const updatedAdmin: Admin = {
        ...user,
        name: data.name || user.name,
        email: data.email || user.email,
      };

      persistSessionUser(updatedAdmin);
      return true;
    }

    const trainee = user as Trainee;
    try {
      const updatedTrainee = await updateTraineeRecord(trainee.id, {
        name: data.name,
        email: data.email,
        qualifications: data.qualifications ?? trainee.qualifications,
        university: data.university ?? trainee.university,
        reason: data.reason ?? trainee.reason,
      });
      persistSessionUser(updatedTrainee);
      return true;
    } catch {
      return false;
    }
  };

  const enrollInCourse = async (courseId: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    if (trainee.enrolledCourses.includes(courseId)) return;

    try {
      const updatedTrainee = await updateTraineeRecord(trainee.id, {
        enrolled_courses: [...trainee.enrolledCourses, courseId],
        course_progress: { ...trainee.courseProgress, [courseId]: 0 },
        completed_modules: { ...trainee.completedModules, [courseId]: [] },
      });
      persistSessionUser(updatedTrainee);
    } catch {
      return;
    }
  };

  const updateCourseProgress = async (courseId: number, progress: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    try {
      const updatedTrainee = await updateTraineeRecord(trainee.id, {
        course_progress: { ...trainee.courseProgress, [courseId]: progress },
      });
      persistSessionUser(updatedTrainee);
    } catch {
      return;
    }
  };

  const updateCompletedModules = async (courseId: number, moduleId: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    const currentModules = trainee.completedModules[courseId] || [];

    if (currentModules.includes(moduleId)) return;

    try {
      const updatedTrainee = await updateTraineeRecord(trainee.id, {
        completed_modules: {
          ...trainee.completedModules,
          [courseId]: [...currentModules, moduleId],
        },
      });
      persistSessionUser(updatedTrainee);
    } catch {
      return;
    }
  };

  const getAllTrainees = async (): Promise<Trainee[]> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${COE_TABLE}?select=*&order=created_at.desc`, {
        headers: SUPABASE_HEADERS,
      });
      if (!response.ok) {
        return [];
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) {
        return [];
      }
      return rows.map(mapTraineeFromDb);
    } catch {
      return [];
    }
  };

  const deleteTrainee = async (traineeId: string) => {
    await fetch(`${SUPABASE_URL}/rest/v1/${COE_TABLE}?id=eq.${encodeURIComponent(traineeId)}`, {
      method: "DELETE",
      headers: SUPABASE_HEADERS,
    });
  };

  const addTrainee = async (
    data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${COE_TABLE}`, {
        method: "POST",
        headers: {
          ...SUPABASE_HEADERS,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          qualifications: data.qualifications,
          university: data.university,
          cnic: data.cnic,
          reason: data.reason,
          role: "trainee",
          enrolled_courses: [],
          course_progress: {},
          completed_modules: {},
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        sendTraineeCredentialsEmail,
        signup,
        updateProfile,
        logout,
        enrollInCourse,
        updateCourseProgress,
        updateCompletedModules,
        getAllTrainees,
        deleteTrainee,
        addTrainee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
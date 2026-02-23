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
  login: (email: string, password?: string) => boolean;
  signup: (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">) => boolean;
  updateProfile: (data: {
    name: string;
    email: string;
    qualifications?: string;
    university?: string;
    reason?: string;
  }) => boolean;
  logout: () => void;
  enrollInCourse: (courseId: number) => void;
  updateCourseProgress: (courseId: number, progress: number) => void;
  updateCompletedModules: (courseId: number, moduleId: number) => void;
  getAllTrainees: () => Trainee[];
  deleteTrainee: (traineeId: string) => void;
  addTrainee: (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_CREDENTIALS = {
  name: "Shahnawaz",
  email: "shanu1998end@gmail.com",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem("ndma_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (email: string, password?: string): boolean => {
    // Admin login
    if (email === ADMIN_CREDENTIALS.email) {
      const adminUser: Admin = {
        id: "admin-1",
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email,
        role: "admin",
      };
      setUser(adminUser);
      localStorage.setItem("ndma_user", JSON.stringify(adminUser));
      return true;
    }

    // Trainee login - check localStorage for existing trainees
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    const trainee = trainees.find((t: Trainee) => t.email === email);
    
    if (trainee) {
      setUser(trainee);
      localStorage.setItem("ndma_user", JSON.stringify(trainee));
      return true;
    }

    return false;
  };

  const signup = (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">): boolean => {
    // Check if email already exists
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    if (trainees.some((t: Trainee) => t.email === data.email)) {
      return false; // Email already exists
    }

    const newTrainee: Trainee = {
      ...data,
      id: `trainee-${Date.now()}`,
      role: "trainee",
      enrolledCourses: [],
      courseProgress: {},
      completedModules: {},
    };

    trainees.push(newTrainee);
    localStorage.setItem("ndma_trainees", JSON.stringify(trainees));
    
    setUser(newTrainee);
    localStorage.setItem("ndma_user", JSON.stringify(newTrainee));
    
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ndma_user");
  };

  const updateProfile = (data: {
    name: string;
    email: string;
    qualifications?: string;
    university?: string;
    reason?: string;
  }): boolean => {
    if (!user) return false;

    if (user.role === "admin") {
      const updatedAdmin: Admin = {
        ...user,
        name: data.name || user.name,
        email: data.email || user.email,
      };

      setUser(updatedAdmin);
      localStorage.setItem("ndma_user", JSON.stringify(updatedAdmin));
      return true;
    }

    const trainee = user as Trainee;
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]") as Trainee[];

    const duplicateEmail = trainees.some(
      (entry) => entry.id !== trainee.id && entry.email.toLowerCase() === data.email.toLowerCase(),
    );

    if (duplicateEmail) {
      return false;
    }

    const updatedTrainee: Trainee = {
      ...trainee,
      name: data.name,
      email: data.email,
      qualifications: data.qualifications ?? trainee.qualifications,
      university: data.university ?? trainee.university,
      reason: data.reason ?? trainee.reason,
    };

    setUser(updatedTrainee);
    localStorage.setItem("ndma_user", JSON.stringify(updatedTrainee));

    const updatedTrainees = trainees.map((entry) =>
      entry.id === trainee.id ? updatedTrainee : entry,
    );
    localStorage.setItem("ndma_trainees", JSON.stringify(updatedTrainees));

    return true;
  };

  const enrollInCourse = (courseId: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    if (trainee.enrolledCourses.includes(courseId)) return;

    const updatedTrainee: Trainee = {
      ...trainee,
      enrolledCourses: [...trainee.enrolledCourses, courseId],
      courseProgress: { ...trainee.courseProgress, [courseId]: 0 },
      completedModules: { ...trainee.completedModules, [courseId]: [] },
    };

    // Update in state
    setUser(updatedTrainee);
    localStorage.setItem("ndma_user", JSON.stringify(updatedTrainee));

    // Update in trainees list
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    const updatedTrainees = trainees.map((t: Trainee) =>
      t.id === trainee.id ? updatedTrainee : t
    );
    localStorage.setItem("ndma_trainees", JSON.stringify(updatedTrainees));
  };

  const updateCourseProgress = (courseId: number, progress: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    const updatedTrainee: Trainee = {
      ...trainee,
      courseProgress: { ...trainee.courseProgress, [courseId]: progress },
    };

    setUser(updatedTrainee);
    localStorage.setItem("ndma_user", JSON.stringify(updatedTrainee));

    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    const updatedTrainees = trainees.map((t: Trainee) =>
      t.id === trainee.id ? updatedTrainee : t
    );
    localStorage.setItem("ndma_trainees", JSON.stringify(updatedTrainees));
  };

  const updateCompletedModules = (courseId: number, moduleId: number) => {
    if (!user || user.role !== "trainee") return;

    const trainee = user as Trainee;
    const currentModules = trainee.completedModules[courseId] || [];
    
    if (currentModules.includes(moduleId)) return;

    const updatedModules = [...currentModules, moduleId];
    const updatedTrainee: Trainee = {
      ...trainee,
      completedModules: {
        ...trainee.completedModules,
        [courseId]: updatedModules,
      },
    };

    setUser(updatedTrainee);
    localStorage.setItem("ndma_user", JSON.stringify(updatedTrainee));

    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    const updatedTrainees = trainees.map((t: Trainee) =>
      t.id === trainee.id ? updatedTrainee : t
    );
    localStorage.setItem("ndma_trainees", JSON.stringify(updatedTrainees));
  };

  const getAllTrainees = (): Trainee[] => {
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    return trainees;
  };

  const deleteTrainee = (traineeId: string) => {
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    const updatedTrainees = trainees.filter((t: Trainee) => t.id !== traineeId);
    localStorage.setItem("ndma_trainees", JSON.stringify(updatedTrainees));
  };

  const addTrainee = (data: Omit<Trainee, "id" | "role" | "enrolledCourses" | "courseProgress" | "completedModules">): boolean => {
    // Check if email already exists
    const trainees = JSON.parse(localStorage.getItem("ndma_trainees") || "[]");
    if (trainees.some((t: Trainee) => t.email === data.email)) {
      return false; // Email already exists
    }

    const newTrainee: Trainee = {
      ...data,
      id: `trainee-${Date.now()}`,
      role: "trainee",
      enrolledCourses: [],
      courseProgress: {},
      completedModules: {},
    };

    trainees.push(newTrainee);
    localStorage.setItem("ndma_trainees", JSON.stringify(trainees));
    
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
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
import { createHashRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { TrainingPrograms } from "./pages/TrainingPrograms";
import { CourseDetail } from "./pages/CourseDetail";
import { Certification } from "./pages/Certification";
import { KnowledgeRepository } from "./pages/KnowledgeRepository";
import { Assessments } from "./pages/Assessments";
import { ProgressAnalytics } from "./pages/ProgressAnalytics";
import { AdminSettings } from "./pages/AdminSettings";
import { Auth } from "./pages/Auth";
import { MyCourses } from "./pages/MyCourses";
import { Profile } from "./pages/Profile";
import { SettingsPage } from "./pages/Settings";

export const router = createHashRouter([
  {
    path: "/auth",
    Component: Auth,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "training", Component: TrainingPrograms },
      { path: "training/:id", Component: CourseDetail },
      { path: "my-courses", Component: MyCourses },
      { path: "certification", Component: Certification },
      { path: "knowledge", Component: KnowledgeRepository },
      { path: "assessments", Component: Assessments },
      { path: "analytics", Component: ProgressAnalytics },
      { path: "profile", Component: Profile },
      { path: "settings", Component: SettingsPage },
      { path: "admin", Component: AdminSettings },
    ],
  },
]);
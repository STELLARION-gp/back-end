import { ResourceOptions } from "adminjs";

/**
 * Quizzes Resource Configuration
 */
export const quizzesResourceOptions: ResourceOptions = {
  navigation: {
    name: "Learning & Engagement",
    icon: "Quiz",
  },
  properties: {
    id: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
    name: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      isRequired: true,
    },
    category: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    description: {
      type: "textarea",
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    status: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      availableValues: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
    level: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      availableValues: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
    },
    question_count: {
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
    participants_count: {
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
    time_limit: {
      isVisible: { list: true, filter: false, show: true, edit: true },
    },
    created_at: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
  },
  listProperties: [
    "id",
    "name",
    "category",
    "level",
    "status",
    "question_count",
    "participants_count",
    "created_at",
  ],
  filterProperties: ["name", "category", "level", "status", "created_at"],
  showProperties: [
    "id",
    "name",
    "category",
    "description",
    "level",
    "status",
    "question_count",
    "participants_count",
    "time_limit",
    "created_at",
  ],
  editProperties: [
    "name",
    "category",
    "description",
    "level",
    "status",
    "time_limit",
  ],
};

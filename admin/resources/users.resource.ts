import { ResourceOptions } from "adminjs";

/**
 * Users Resource Configuration
 * Defines how the users table is displayed and managed in AdminJS
 */
export const usersResourceOptions: ResourceOptions = {
  navigation: {
    name: "User Management",
    icon: "User",
  },
  properties: {
    id: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
    firebase_uid: {
      isVisible: { list: false, filter: false, show: true, edit: false },
    },
    email: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      isRequired: true,
    },
    username: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    full_name: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    role: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      availableValues: [
        { value: "user", label: "User" },
        { value: "mentor", label: "Mentor" },
        { value: "admin", label: "Admin" },
        { value: "influencer", label: "Influencer" },
        { value: "guide", label: "Guide" },
      ],
    },
    is_active: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    subscription_tier: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      availableValues: [
        { value: "free", label: "Free" },
        { value: "basic", label: "Basic" },
        { value: "premium", label: "Premium" },
        { value: "enterprise", label: "Enterprise" },
      ],
    },
    created_at: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
    updated_at: {
      isVisible: { list: false, filter: false, show: true, edit: false },
    },
    last_login: {
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
  },
  listProperties: [
    "id",
    "email",
    "username",
    "full_name",
    "role",
    "subscription_tier",
    "is_active",
    "created_at",
  ],
  filterProperties: [
    "email",
    "username",
    "role",
    "subscription_tier",
    "is_active",
    "created_at",
  ],
  showProperties: [
    "id",
    "firebase_uid",
    "email",
    "username",
    "full_name",
    "role",
    "subscription_tier",
    "is_active",
    "created_at",
    "updated_at",
    "last_login",
  ],
  editProperties: [
    "email",
    "username",
    "full_name",
    "role",
    "subscription_tier",
    "is_active",
  ],
};

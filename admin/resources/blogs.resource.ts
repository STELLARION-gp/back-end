import { ResourceOptions } from "adminjs";

/**
 * Blogs Resource Configuration
 */
export const blogsResourceOptions: ResourceOptions = {
  navigation: {
    name: "Content Management",
    icon: "Article",
  },
  properties: {
    id: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
    title: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      isRequired: true,
    },
    content: {
      type: "richtext",
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    excerpt: {
      type: "textarea",
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    author_name: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    status: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      availableValues: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
      ],
    },
    is_featured: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    views_count: {
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
    likes_count: {
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
    created_at: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
  },
  listProperties: [
    "id",
    "title",
    "author_name",
    "status",
    "is_featured",
    "views_count",
    "likes_count",
    "created_at",
  ],
  filterProperties: [
    "title",
    "author_name",
    "status",
    "is_featured",
    "created_at",
  ],
  showProperties: [
    "id",
    "title",
    "excerpt",
    "content",
    "author_name",
    "status",
    "is_featured",
    "views_count",
    "likes_count",
    "created_at",
  ],
  editProperties: [
    "title",
    "excerpt",
    "content",
    "author_name",
    "status",
    "is_featured",
  ],
};

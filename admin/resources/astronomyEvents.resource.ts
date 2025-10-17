import { ResourceOptions } from "adminjs";

/**
 * Astronomy Events Resource Configuration
 */
export const astronomyEventsResourceOptions: ResourceOptions = {
  navigation: {
    name: "Events & Activities",
    icon: "Star",
  },
  properties: {
    id: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
    name: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      isRequired: true,
    },
    description: {
      type: "textarea",
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    event_type: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    event_date: {
      isVisible: { list: true, filter: true, show: true, edit: true },
      isRequired: true,
    },
    end_date: {
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    visibility: {
      isVisible: { list: true, filter: false, show: true, edit: true },
    },
    best_time: {
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
    is_active: {
      isVisible: { list: true, filter: true, show: true, edit: true },
    },
    created_at: {
      isVisible: { list: true, filter: true, show: true, edit: false },
    },
  },
  listProperties: [
    "id",
    "name",
    "event_type",
    "event_date",
    "visibility",
    "is_active",
    "created_at",
  ],
  filterProperties: ["name", "event_type", "is_active", "event_date"],
  showProperties: [
    "id",
    "name",
    "description",
    "event_type",
    "event_date",
    "end_date",
    "visibility",
    "best_time",
    "is_active",
    "created_at",
  ],
  editProperties: [
    "name",
    "description",
    "event_type",
    "event_date",
    "end_date",
    "visibility",
    "best_time",
    "is_active",
  ],
};

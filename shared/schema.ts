import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  unique,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("trial"),
  subscriptionPlan: varchar("subscription_plan").default("trial"), // 'trial', 'basic', 'standard', 'premium'
  mealCredits: integer("meal_credits").default(10), // Start with 10 free trial meals
  totalMealsUsed: integer("total_meals_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences for meal planning
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  proteinPreferences: jsonb("protein_preferences").$type<string[]>().default([]),
  cuisinePreferences: jsonb("cuisine_preferences").$type<string[]>().default([]),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meals suggested by AI
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  cuisine: varchar("cuisine"),
  protein: varchar("protein"),
  cookingTime: integer("cooking_time"), // in minutes
  rating: decimal("rating", { precision: 2, scale: 1 }),
  imageUrl: varchar("image_url"),
  imageDescription: text("image_description"),
  ingredients: jsonb("ingredients").$type<string[]>().default([]),
  instructions: text("instructions"),
  sourceUrl: varchar("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User's selected meals for meal planning
export const userMealSelections = pgTable("user_meal_selections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("week_start_date").notNull(),
  selectedAt: timestamp("selected_at").defaultNow(),
});

// Generated grocery lists
export const groceryLists = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("week_start_date").notNull(),
  ingredients: jsonb("ingredients").$type<{category: string, items: string[]}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorite meals
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userMealUnique: unique().on(table.userId, table.mealId),
}));

// Meal calendar entries
export const mealCalendar = pgTable("meal_calendar", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  scheduledDate: date("scheduled_date").notNull(),
  mealType: varchar("meal_type", { length: 20 }).notNull().default("dinner"), // breakfast, lunch, dinner
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateMealUnique: unique().on(table.userId, table.scheduledDate, table.mealType),
}));

// Schemas for validation
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  createdAt: true,
});

export const insertUserMealSelectionSchema = createInsertSchema(userMealSelections).omit({
  id: true,
  selectedAt: true,
});

export const insertGroceryListSchema = createInsertSchema(groceryLists).omit({
  id: true,
  createdAt: true,
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertMealCalendarSchema = createInsertSchema(mealCalendar).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type UserMealSelection = typeof userMealSelections.$inferSelect;
export type InsertUserMealSelection = z.infer<typeof insertUserMealSelectionSchema>;
export type GroceryList = typeof groceryLists.$inferSelect;
export type InsertGroceryList = z.infer<typeof insertGroceryListSchema>;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;
export type MealCalendar = typeof mealCalendar.$inferSelect;
export type InsertMealCalendar = z.infer<typeof insertMealCalendarSchema>;

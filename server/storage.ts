import {
  users,
  userPreferences,
  meals,
  userMealSelections,
  groceryLists,
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type Meal,
  type InsertMeal,
  type UserMealSelection,
  type InsertUserMealSelection,
  type GroceryList,
  type InsertGroceryList,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionStatus(userId: string, status: string): Promise<User>;
  
  // User preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Meals
  getMeal(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  getMealsByPreferences(proteinPrefs: string[], cuisinePrefs: string[], limit?: number): Promise<Meal[]>;
  
  // User meal selections
  getUserMealSelections(userId: string, weekStartDate: Date): Promise<UserMealSelection[]>;
  addMealSelection(selection: InsertUserMealSelection): Promise<UserMealSelection>;
  removeMealSelection(userId: string, mealId: number, weekStartDate: Date): Promise<void>;
  
  // Grocery lists
  getGroceryList(userId: string, weekStartDate: Date): Promise<GroceryList | undefined>;
  upsertGroceryList(groceryList: InsertGroceryList): Promise<GroceryList>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateSubscriptionStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [result] = await db
      .insert(userPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Meals
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal;
  }

  async createMeal(meal: InsertMeal): Promise<Meal> {
    const [result] = await db.insert(meals).values(meal).returning();
    return result;
  }

  async getMealsByPreferences(proteinPrefs: string[], cuisinePrefs: string[], limit = 10): Promise<Meal[]> {
    // Simple implementation - in practice you'd want more sophisticated filtering
    const results = await db
      .select()
      .from(meals)
      .limit(limit)
      .orderBy(desc(meals.rating));
    return results;
  }

  // User meal selections
  async getUserMealSelections(userId: string, weekStartDate: Date): Promise<UserMealSelection[]> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    return await db
      .select()
      .from(userMealSelections)
      .where(
        and(
          eq(userMealSelections.userId, userId),
          gte(userMealSelections.weekStartDate, weekStartDate),
          lte(userMealSelections.weekStartDate, weekEndDate)
        )
      );
  }

  async addMealSelection(selection: InsertUserMealSelection): Promise<UserMealSelection> {
    const [result] = await db
      .insert(userMealSelections)
      .values(selection)
      .returning();
    return result;
  }

  async removeMealSelection(userId: string, mealId: number, weekStartDate: Date): Promise<void> {
    await db
      .delete(userMealSelections)
      .where(
        and(
          eq(userMealSelections.userId, userId),
          eq(userMealSelections.mealId, mealId),
          eq(userMealSelections.weekStartDate, weekStartDate)
        )
      );
  }

  // Grocery lists
  async getGroceryList(userId: string, weekStartDate: Date): Promise<GroceryList | undefined> {
    const [groceryList] = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.userId, userId),
          eq(groceryLists.weekStartDate, weekStartDate)
        )
      );
    return groceryList;
  }

  async upsertGroceryList(groceryListData: InsertGroceryList): Promise<GroceryList> {
    const [result] = await db
      .insert(groceryLists)
      .values(groceryListData)
      .onConflictDoUpdate({
        target: [groceryLists.userId, groceryLists.weekStartDate],
        set: {
          ingredients: groceryListData.ingredients,
        },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();

import {
  users,
  userPreferences,
  meals,
  userMealSelections,
  groceryLists,
  userFavorites,
  mealCalendar,
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
  type UserFavorite,
  type InsertUserFavorite,
  type MealCalendar,
  type InsertMealCalendar,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionStatus(userId: number, status: string): Promise<User>;
  updateUserMealCredits(userId: number, credits: number, plan: string): Promise<User>;
  deductMealCredit(userId: number): Promise<User | null>;
  
  // User preferences
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Meals
  getMeal(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  getMealsByPreferences(proteinPrefs: string[], cuisinePrefs: string[], limit?: number): Promise<Meal[]>;
  getUserRecipes(userId: number): Promise<Meal[]>;
  
  // User meal selections
  getUserMealSelections(userId: number, weekStartDate: Date): Promise<UserMealSelection[]>;
  addMealSelection(selection: InsertUserMealSelection): Promise<UserMealSelection>;
  removeMealSelection(userId: number, mealId: number, weekStartDate: Date): Promise<void>;
  
  // Grocery lists
  getGroceryList(userId: number, weekStartDate: Date): Promise<GroceryList | undefined>;
  upsertGroceryList(groceryList: InsertGroceryList): Promise<GroceryList>;
  
  // User favorites
  getUserFavorites(userId: number): Promise<(UserFavorite & { meal: Meal })[]>;
  addToFavorites(userId: number, mealId: number): Promise<UserFavorite>;
  removeFromFavorites(userId: number, mealId: number): Promise<void>;
  
  // Meal calendar
  getCalendarMeals(userId: number, startDate: Date, endDate: Date): Promise<(MealCalendar & { meal: Meal })[]>;
  addToCalendar(calendar: InsertMealCalendar): Promise<MealCalendar>;
  removeFromCalendar(userId: number, scheduledDate: Date, mealType: string): Promise<void>;
  updateCalendarEntry(userId: number, scheduledDate: Date, mealType: string, mealId: number): Promise<MealCalendar>;
}

export class DatabaseStorage implements IStorage {
  // User operations (email/password auth)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  async updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
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

  async updateSubscriptionStatus(userId: number, status: string): Promise<User> {
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

  async updateUserMealCredits(userId: number, credits: number, plan: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        mealCredits: credits,
        subscriptionPlan: plan,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deductMealCredit(userId: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.mealCredits === null || user.mealCredits <= 0) {
      return null;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        mealCredits: user.mealCredits - 1,
        totalMealsUsed: (user.totalMealsUsed || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  // User preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [result] = await db
      .insert(userPreferences)
      .values({
        ...preferences,
        updatedAt: new Date(),
      })
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
    return await db
      .select()
      .from(meals)
      .where(
        and(
          proteinPrefs.length > 0 ? sql`${meals.protein} = ANY(${proteinPrefs})` : undefined,
          cuisinePrefs.length > 0 ? sql`${meals.cuisine} = ANY(${cuisinePrefs})` : undefined,
          eq(meals.isUserGenerated, false) // Only AI-generated meals
        )
      )
      .orderBy(desc(meals.createdAt))
      .limit(limit);
  }

  async getUserRecipes(userId: number): Promise<Meal[]> {
    return await db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
      .orderBy(desc(meals.createdAt));
  }

  // User meal selections
  async getUserMealSelections(userId: number, weekStartDate: Date): Promise<UserMealSelection[]> {
    return await db
      .select()
      .from(userMealSelections)
      .where(
        and(
          eq(userMealSelections.userId, userId),
          eq(userMealSelections.weekStartDate, weekStartDate)
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

  async removeMealSelection(userId: number, mealId: number, weekStartDate: Date): Promise<void> {
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
  async getGroceryList(userId: number, weekStartDate: Date): Promise<GroceryList | undefined> {
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
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // User favorites
  async getUserFavorites(userId: number): Promise<(UserFavorite & { meal: Meal })[]> {
    return await db
      .select()
      .from(userFavorites)
      .innerJoin(meals, eq(userFavorites.mealId, meals.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));
  }

  async addToFavorites(userId: number, mealId: number): Promise<UserFavorite> {
    const [favorite] = await db
      .insert(userFavorites)
      .values({ userId, mealId })
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, mealId: number): Promise<void> {
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.mealId, mealId)
        )
      );
  }

  // Meal calendar
  async getCalendarMeals(userId: number, startDate: Date, endDate: Date): Promise<(MealCalendar & { meal: Meal })[]> {
    return await db
      .select()
      .from(mealCalendar)
      .innerJoin(meals, eq(mealCalendar.mealId, meals.id))
      .where(
        and(
          eq(mealCalendar.userId, userId),
          gte(mealCalendar.scheduledDate, startDate),
          lte(mealCalendar.scheduledDate, endDate)
        )
      )
      .orderBy(mealCalendar.scheduledDate);
  }

  async addToCalendar(calendarData: InsertMealCalendar): Promise<MealCalendar> {
    const [result] = await db
      .insert(mealCalendar)
      .values(calendarData)
      .returning();
    return result;
  }

  async removeFromCalendar(userId: number, scheduledDate: Date, mealType: string): Promise<void> {
    await db
      .delete(mealCalendar)
      .where(
        and(
          eq(mealCalendar.userId, userId),
          eq(mealCalendar.scheduledDate, scheduledDate),
          eq(mealCalendar.mealType, mealType)
        )
      );
  }

  async updateCalendarEntry(userId: number, scheduledDate: Date, mealType: string, mealId: number): Promise<MealCalendar> {
    const [result] = await db
      .update(mealCalendar)
      .set({
        mealId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mealCalendar.userId, userId),
          eq(mealCalendar.scheduledDate, scheduledDate),
          eq(mealCalendar.mealType, mealType)
        )
      )
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
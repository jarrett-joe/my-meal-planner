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
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateSubscriptionStatus(userId: string, status: string): Promise<User>;
  updateUserMealCredits(userId: string, credits: number, plan: string): Promise<User>;
  deductMealCredit(userId: string): Promise<User | null>;
  
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
  
  // User favorites
  getUserFavorites(userId: string): Promise<(UserFavorite & { meal: Meal })[]>;
  addToFavorites(userId: string, mealId: number): Promise<UserFavorite>;
  removeFromFavorites(userId: string, mealId: number): Promise<void>;
  
  // Meal calendar
  getCalendarMeals(userId: string, startDate: Date, endDate: Date): Promise<(MealCalendar & { meal: Meal })[]>;
  addToCalendar(calendar: InsertMealCalendar): Promise<MealCalendar>;
  removeFromCalendar(userId: string, scheduledDate: Date, mealType: string): Promise<void>;
  updateCalendarEntry(userId: string, scheduledDate: Date, mealType: string, mealId: number): Promise<MealCalendar>;
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

  async updateUserMealCredits(userId: string, credits: number, plan: string): Promise<User> {
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

  async deductMealCredit(userId: string): Promise<User | null> {
    const user = await this.getUser(userId);
    if (!user || user.mealCredits <= 0) {
      return null;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        mealCredits: user.mealCredits - 1,
        totalMealsUsed: user.totalMealsUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
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
    // First try to find existing preferences
    const existing = await this.getUserPreferences(preferences.userId);
    
    if (existing) {
      // Update existing preferences
      const [result] = await db
        .update(userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, preferences.userId))
        .returning();
      return result;
    } else {
      // Insert new preferences
      const [result] = await db
        .insert(userPreferences)
        .values(preferences)
        .returning();
      return result;
    }
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
    // Check if grocery list exists first
    const existing = await this.getGroceryList(groceryListData.userId, groceryListData.weekStartDate);
    
    if (existing) {
      // Update existing
      const [result] = await db
        .update(groceryLists)
        .set({
          ingredients: groceryListData.ingredients,
        })
        .where(
          and(
            eq(groceryLists.userId, groceryListData.userId),
            eq(groceryLists.weekStartDate, groceryListData.weekStartDate)
          )
        )
        .returning();
      return result;
    } else {
      // Insert new
      const [result] = await db
        .insert(groceryLists)
        .values(groceryListData)
        .returning();
      return result;
    }
  }

  // User favorites methods
  async getUserFavorites(userId: string): Promise<(UserFavorite & { meal: Meal })[]> {
    const favorites = await db
      .select({
        id: userFavorites.id,
        userId: userFavorites.userId,
        mealId: userFavorites.mealId,
        createdAt: userFavorites.createdAt,
        meal: meals,
      })
      .from(userFavorites)
      .innerJoin(meals, eq(userFavorites.mealId, meals.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));
    
    return favorites;
  }

  async addToFavorites(userId: string, mealId: number): Promise<UserFavorite> {
    const [favorite] = await db
      .insert(userFavorites)
      .values({ userId, mealId })
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: string, mealId: number): Promise<void> {
    await db
      .delete(userFavorites)
      .where(and(eq(userFavorites.userId, userId), eq(userFavorites.mealId, mealId)));
  }

  // Meal calendar methods
  async getCalendarMeals(userId: string, startDate: Date, endDate: Date): Promise<(MealCalendar & { meal: Meal })[]> {
    const calendarMeals = await db
      .select({
        id: mealCalendar.id,
        userId: mealCalendar.userId,
        mealId: mealCalendar.mealId,
        scheduledDate: mealCalendar.scheduledDate,
        mealType: mealCalendar.mealType,
        createdAt: mealCalendar.createdAt,
        meal: meals,
      })
      .from(mealCalendar)
      .innerJoin(meals, eq(mealCalendar.mealId, meals.id))
      .where(
        and(
          eq(mealCalendar.userId, userId),
          gte(mealCalendar.scheduledDate, startDate.toISOString().split('T')[0]),
          lte(mealCalendar.scheduledDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(mealCalendar.scheduledDate, mealCalendar.mealType);
    
    return calendarMeals;
  }

  async addToCalendar(calendarData: InsertMealCalendar): Promise<MealCalendar> {
    const [calendar] = await db
      .insert(mealCalendar)
      .values(calendarData)
      .onConflictDoUpdate({
        target: [mealCalendar.userId, mealCalendar.scheduledDate, mealCalendar.mealType],
        set: {
          mealId: calendarData.mealId,
        },
      })
      .returning();
    return calendar;
  }

  async removeFromCalendar(userId: string, scheduledDate: Date, mealType: string): Promise<void> {
    await db
      .delete(mealCalendar)
      .where(
        and(
          eq(mealCalendar.userId, userId),
          eq(mealCalendar.scheduledDate, scheduledDate.toISOString().split('T')[0]),
          eq(mealCalendar.mealType, mealType)
        )
      );
  }

  async updateCalendarEntry(userId: string, scheduledDate: Date, mealType: string, mealId: number): Promise<MealCalendar> {
    const [calendar] = await db
      .update(mealCalendar)
      .set({ mealId })
      .where(
        and(
          eq(mealCalendar.userId, userId),
          eq(mealCalendar.scheduledDate, scheduledDate.toISOString().split('T')[0]),
          eq(mealCalendar.mealType, mealType)
        )
      )
      .returning();
    return calendar;
  }
}

export const storage = new DatabaseStorage();

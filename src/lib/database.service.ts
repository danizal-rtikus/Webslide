import { supabase } from './supabase';
import { WebSlideJson } from '../utils/geminiApi';

export interface CloudWebSlide {
  id: string;
  user_id: string;
  title: string;
  author: string;
  course: string;
  data: WebSlideJson;
  html: string;
  template_id: string;
  is_public: boolean;
  created_at: string;
}

export const databaseService = {
  /**
   * Save a WebSlide to the Supabase cloud table.
   */
  async saveWebSlide(params: {
    userId: string;
    title: string;
    author: string;
    course: string;
    data: WebSlideJson;
    html: string;
    templateId: string;
    isPublic?: boolean;
  }) {
    const { data, error } = await supabase
      .from('web_slides')
      .insert([
        {
          user_id: params.userId,
          title: params.title || 'Tanpa Judul',
          author: params.author || '',
          course: params.course || '',
          data: params.data,
          html: params.html,
          template_id: params.templateId,
          is_public: params.isPublic || false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as CloudWebSlide;
  },

  /**
   * Fetch WebSlide history for a specific user.
   */
  async fetchHistory(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('web_slides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as CloudWebSlide[];
  },

  /**
   * Delete a WebSlide from the cloud.
   */
  async deleteWebSlide(id: string) {
    const { error } = await supabase
      .from('web_slides')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Deduct credits from user profile.
   */
  async deductCredits(userId: string, amount: number) {
    // We use a RPC or a manual decrement here. 
    // Since Supabase doesn't have a built-in decrement in the JS library easily without RPC, 
    // we'll fetch then update. (Note: For high-concurrency, use a Postgres function/RPC).
    
    // First, get current credits
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newCredits = (profile.credits || 0) - amount;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: Math.max(0, newCredits) })
      .eq('id', userId);
      
    if (updateError) throw updateError;

    // Log the usage transaction
    await databaseService.logTransaction({
      userId,
      type: 'usage',
      amount: -amount,
      description: `Generasi WebSlide (${amount} kredit)`,
    });

    return newCredits;
  },

  /**
   * Log a credit transaction.
   */
  async logTransaction(params: {
    userId: string,
    type: 'topup' | 'usage' | 'manual',
    amount: number,
    description: string,
    metadata?: any
  }) {
    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: params.userId,
          type: params.type,
          amount: params.amount,
          description: params.description,
          metadata: params.metadata || {},
        }
      ]);
    
    if (error) throw error;
  },

  /**
   * Toggle the public visibility of a WebSlide.
   */
  async togglePublic(id: string, isPublic: boolean) {
    const { error } = await supabase
      .from('web_slides')
      .update({ is_public: isPublic })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * ADMIN: Fetch all user profiles. 
   * Requires RLS policy for 'admin' role to work correctly.
   */
  async adminGetAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * ADMIN: Update any user profile's credits or role.
   */
  async adminUpdateProfile(userId: string, updates: { credits?: number, role?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * ADMIN: Fetch all transactions.
   */
  async adminFetchTransactions(limit = 100) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * ADMIN: Fetch global stats for analytics.
   */
  async adminFetchGlobalStats() {
    // Basic stats from transactions table
    const { data: trans, error: tErr } = await supabase
      .from('transactions')
      .select('type, amount');
    
    if (tErr) throw tErr;

    const stats = {
      totalTopupCredits: 0,
       totalUsageCredits: 0,
       totalRevenueEstimasi: 0 // Local estimation based on 49k per 5k credits
    };

    trans.forEach(t => {
      if (t.amount > 0) stats.totalTopupCredits += t.amount;
      else stats.totalUsageCredits += Math.abs(t.amount);
    });

    return stats;
  }
};

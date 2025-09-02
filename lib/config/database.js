// lib/config/database.js
// Supabase database configuration for Vercel deployment

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Initialize Supabase client (singleton pattern for serverless)
const getSupabaseClient = () => {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase configuration missing");
      throw new Error(
        "Supabase configuration missing. Please check your environment variables."
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }

  return supabase;
};

// Test database connection
const testConnection = async () => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from("users").select("count").limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 = table doesn't exist
      throw error;
    }

    console.log("✅ Supabase connection successful");
    return { success: true, message: "Connected successfully" };
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getSupabaseClient,
  testConnection,
};


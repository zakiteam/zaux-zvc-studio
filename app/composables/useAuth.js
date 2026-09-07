import { computed, ref } from 'vue';
import { useSupabaseClient } from '../services/supabase.js';

const user = ref(null);
const profile = ref(null);
const ready = ref(false);
const error = ref('');
let initialized = false;
let unsubscribe;

async function sync(session) {
  if (!session?.user) { user.value = null; profile.value = null; return; }
  const { data, error: profileError } = await useSupabaseClient().from('profiles').select('id, full_name, active').eq('id', session.user.id).single();
  if (profileError || !data?.active) {
    error.value = profileError ? 'zx_builder_account_unavailable' : 'zx_builder_account_disabled';
    await useSupabaseClient().auth.signOut();
    user.value = null; profile.value = null;
    return;
  }
  user.value = session.user;
  profile.value = data;
}

export function useAuth() {
  const supabase = useSupabaseClient();
  async function init() {
    if (initialized) return;
    initialized = true;
    const { data } = await supabase.auth.getSession();
    await sync(data.session);
    supabase.auth.onAuthStateChange((_event, session) => { sync(session); });
    ready.value = true;
  }
  async function signIn(email, password) {
    error.value = '';
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { error.value = 'zx_builder_login_failed'; return false; }
    await sync(data.session);
    return !!user.value;
  }
  async function signOut() { await supabase.auth.signOut(); user.value = null; profile.value = null; }
  return { user, profile, ready, error, signedIn: computed(() => !!user.value), init, signIn, signOut };
}

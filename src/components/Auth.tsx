import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Chrome } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: any) => {
    const code = err.code;
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not enabled. Please contact support.';
      default:
        return err.message || 'An unexpected error occurred.';
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user doc exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          createdAt: Date.now()
        });
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        // Create user doc
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          createdAt: Date.now()
        });
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Left Side: Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 opacity-95"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] bg-white/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 -right-24 w-96 h-96 bg-accent-400/20 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-[60px]"></div>
        </div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-16"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 font-bold text-xl shadow-2xl shadow-brand-900/20">P</div>
            <span className="text-white font-display font-bold text-2xl tracking-tight">ProfitPulse</span>
          </motion.div>
          
          <div className="space-y-8 max-w-lg">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-display font-bold text-white leading-[1.1] tracking-tight"
            >
              Master your project economy <span className="text-brand-200">with precision.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-brand-100 text-xl leading-relaxed font-medium"
            >
              The all-in-one technical dashboard for developers to track time, manage resources, and generate professional invoices.
            </motion.p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 flex items-center gap-8"
        >
          <div className="flex -space-x-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-brand-700 bg-brand-200 overflow-hidden shadow-xl">
                <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-white text-sm font-bold">Joined by 2,000+ developers</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-brand-300"></div>)}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left space-y-3">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-display font-bold text-slate-900 tracking-tight"
            >
              {isLogin ? 'ProfitPulse Login' : 'Join ProfitPulse'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 font-medium"
            >
              {isLogin ? 'Enter your credentials to access your dashboard' : 'Start managing your projects professionally today'}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold uppercase tracking-widest rounded-2xl flex items-center gap-4 overflow-hidden"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all text-slate-900 font-medium"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all text-slate-900 font-medium"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors" size={20} />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all text-slate-900 font-medium"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold uppercase tracking-widest py-5 rounded-[2rem] transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center gap-3 mt-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-white px-6 text-slate-400 font-bold uppercase tracking-widest">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white text-slate-900 font-bold uppercase tracking-widest py-5 rounded-[2rem] border border-slate-100 transition-all hover:bg-slate-50 hover:border-slate-200 flex items-center justify-center gap-4 active:scale-[0.98] shadow-sm"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              <span>Google Account</span>
            </button>

            <div className="pt-8 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-brand-600 transition-colors"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-brand-600">Sign Up</span></>
                ) : (
                  <>Already have an account? <span className="text-brand-600">Sign In</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

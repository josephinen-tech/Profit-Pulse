import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  ChevronRight, 
  AlertCircle, 
  Upload, 
  FileText, 
  Calculator, 
  Layers, 
  LogOut, 
  User, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  Terminal, 
  Settings, 
  Bell, 
  Menu, 
  X,
  Github,
  Trash2,
  Edit2,
  Zap,
  Download,
  Users,
  CreditCard,
  CheckCircle2,
  Share2,
  FileUp,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { Toaster, toast } from 'sonner';
import { Project, DashboardStats, ResourceCost, Transaction } from './types';
import { formatCurrency, formatHours, cn } from './utils';
import ProjectForm from './components/ProjectForm';
import TimeLogForm from './components/TimeLogForm';
import Analytics from './components/Analytics';
import CsvImport from './components/CsvImport';
import InvoiceModal from './components/InvoiceModal';
import Auth from './components/Auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  orderBy,
  getDocs
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTimeLogForm, setShowTimeLogForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedProjectForInvoice, setSelectedProjectForInvoice] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [focusMode, setFocusMode] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string, role: string, email: string}[]>([]);
  const [showTransactionImport, setShowTransactionImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assigningTransaction, setAssigningTransaction] = useState<Transaction | null>(null);
  const [selectedProjectForLinking, setSelectedProjectForLinking] = useState<Project | null>(null);

  // Derived Team Resources from Projects
  const derivedTeamResources = useMemo(() => {
    const resources = new Map<string, {name: string, projects: string[]}>();
    projects.forEach(p => {
      p.resourceCosts?.forEach(r => {
        if (!resources.has(r.name)) {
          resources.set(r.name, { name: r.name, projects: [p.name] });
        } else {
          resources.get(r.name)?.projects.push(p.name);
        }
      });
    });
    return Array.from(resources.values());
  }, [projects]);

  const handleImportTransactions = async () => {
    if (!user) return;
    
    // More flexible regex to find amounts in various transaction messages
    // Catches "Ksh", "KES", "USD", "$", etc.
    const amountRegex = /(?:Ksh|KES|USD|\$)\s?([0-9,]+\.[0-9]{2})/gi;
    const matches = importText.match(amountRegex);
    
    if (matches) {
      try {
        const importPromise = (async () => {
          for (const m of matches) {
            // Extract numeric value
            const numericMatch = m.match(/[0-9,]+\.[0-9]{2}/);
            if (!numericMatch) continue;
            const val = parseFloat(numericMatch[0].replace(/,/g, ''));
            
            await addDoc(collection(db, 'transactions'), {
              uid: user.uid,
              amount: val,
              date: Date.now(),
              description: `Imported Transaction: ${m}`,
              type: m.toLowerCase().includes('ksh') ? 'mpesa' : 'manual'
            });
          }
        })();

        toast.promise(importPromise, {
          loading: 'Importing transactions...',
          success: `Successfully imported ${matches.length} transactions!`,
          error: 'Failed to import transactions'
        });

        await importPromise;
        setShowTransactionImport(false);
        setImportText('');
        setActiveTab('Billing');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'transactions');
      }
    } else {
      toast.error("No transactions found in the text provided. Ensure amounts are in formats like 'Ksh 1,200.00' or '$50.00'.");
    }
  };

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const handleDeleteTransaction = async (id: string) => {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (transaction?.projectId) {
        const projectId = transaction.projectId;
        const projectRef = doc(db, 'projects', projectId);
        
        // Check if any OTHER transactions are still linked to this project
        const otherLinked = transactions.some(t => t.projectId === projectId && t.id !== id);
        if (!otherLinked) {
          await updateDoc(projectRef, { paymentStatus: 'unpaid' });
        }
      }
      await deleteDoc(doc(db, 'transactions', id));
      toast.success('Transaction deleted');
      setTransactionToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleShareProject = (project: Project) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?project=${project.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Project invitation link copied to clipboard!');
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleAssignTransaction = async (projectId: string) => {
    if (!assigningTransaction || !user) return;
    
    try {
      const transactionRef = doc(db, 'transactions', assigningTransaction.id);
      const projectRef = doc(db, 'projects', projectId);
      
      await updateDoc(transactionRef, { projectId });
      await updateDoc(projectRef, { paymentStatus: 'paid' });
      
      toast.success(`Transaction assigned to project!`);
      setAssigningTransaction(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions/projects');
    }
  };

  const handleUnlinkTransaction = async (transactionId: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction?.projectId) {
        const projectId = transaction.projectId;
        const transactionRef = doc(db, 'transactions', transactionId);
        const projectRef = doc(db, 'projects', projectId);
        
        await updateDoc(transactionRef, { projectId: null });
        
        // Check if any OTHER transactions are still linked to this project
        const otherLinked = transactions.some(t => t.projectId === projectId && t.id !== transactionId);
        if (!otherLinked) {
          await updateDoc(projectRef, { paymentStatus: 'unpaid' });
        }
      } else {
        const transactionRef = doc(db, 'transactions', transactionId);
        await updateDoc(transactionRef, { projectId: null });
      }
      toast.success('Transaction unlinked from project');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
    }
  };

  const handleLinkTransactionToProject = async (transactionId: string) => {
    if (!selectedProjectForLinking || !user) return;
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      const projectRef = doc(db, 'projects', selectedProjectForLinking.id);
      
      await updateDoc(transactionRef, { projectId: selectedProjectForLinking.id });
      await updateDoc(projectRef, { paymentStatus: 'paid' });
      
      toast.success('Transaction linked to project!');
      setSelectedProjectForLinking(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'transactions/projects');
    }
  };

  // Handle Invitation Link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSearchQuery(project.name);
        setActiveTab('Projects');
        toast.info(`Viewing invited project: ${project.name}`);
        // Clear the URL parameter without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [projects]);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const q = query(
      collection(db, 'projects'), 
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Project[];
      setProjects(projectsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    // Data Migration Check: Look for projects without a UID (from previous UI)
    const checkOrphanedProjects = async () => {
      try {
        const allProjectsQuery = query(collection(db, 'projects'));
        const snapshot = await getDocs(allProjectsQuery);
        const orphaned = snapshot.docs.filter(doc => !doc.data().uid);
        
        if (orphaned.length > 0) {
          console.log(`Found ${orphaned.length} orphaned projects. Migrating to user ${user.uid}...`);
          for (const projectDoc of orphaned) {
            await updateDoc(doc(db, 'projects', projectDoc.id), {
              uid: user.uid
            });
          }
        }
      } catch (err) {
        console.error("Migration check failed:", err);
      }
    };
    checkOrphanedProjects();

    return () => unsubscribe();
  }, [user]);

    // Transactions Listener
    useEffect(() => {
      if (!user) {
        setTransactions([]);
        return;
      }
  
      const q = query(
        collection(db, 'transactions'), 
        where('uid', '==', user.uid),
        orderBy('date', 'desc')
      );
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Transaction[];
        setTransactions(transactionsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      });
  
      return () => unsubscribe();
    }, [user]);

  // Calculate Stats
  const stats = useMemo((): DashboardStats => {
    const totalEarned = projects.reduce((acc, p) => {
      const resources = p.resourceCosts?.reduce((sum, r) => sum + r.amount, 0) || 0;
      return acc + p.budget + resources;
    }, 0);
    const totalHours = projects.reduce((acc, p) => acc + p.actualHours, 0);
    const avgHourlyRate = totalHours > 0 ? totalEarned / totalHours : 0;
    
    return {
      totalEarned,
      totalHours,
      avgHourlyRate,
      projectCount: projects.length,
    };
  }, [projects]);

  const addProject = async (newProject: Omit<Project, 'id' | 'actualHours' | 'createdAt' | 'uid'>) => {
    if (!user) return;
    
    try {
      const projectData = {
        ...newProject,
        uid: user.uid,
        actualHours: 0,
        createdAt: Date.now(),
      };
      
      await addDoc(collection(db, 'projects'), projectData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const handleImport = async (importedProjects: Project[]) => {
    if (!user) return;
    
    try {
      for (const p of importedProjects) {
        const { id, ...data } = p;
        await addDoc(collection(db, 'projects'), {
          ...data,
          uid: user.uid,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const logTime = async (projectId: string, hours: number, description: string) => {
    if (!user) return;
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        actualHours: project.actualHours + hours
      });

      // Also create a time entry
      await addDoc(collection(db, 'timeEntries'), {
        uid: user.uid,
        projectId,
        hours,
        description,
        date: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
  };

  const updateProjectStatus = async (projectId: string, status: Project['status']) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const updateProject = async (projectId: string, projectData: Partial<Project>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), projectData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const exportETIMS = async () => {
    const zip = new JSZip();
    const folder = zip.folder("eTIMS_Invoices_KRA");
    
    projects.forEach(p => {
      const resourceTotal = p.resourceCosts?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const totalBudget = p.budget + resourceTotal;
      const content = `
INVOICE - eTIMS FORMAT (KRA)
---------------------------
Project: ${p.name}
Client: ${p.client}
Date: ${new Date(p.createdAt).toLocaleDateString()}
Status: ${p.status.toUpperCase()}
Total Amount: KES ${totalBudget.toLocaleString()}
Logged Hours: ${p.actualHours}
Estimated Hours: ${p.estimatedHours}
---------------------------
Generated via ProfitPulse
      `;
      folder?.file(`${p.name.replace(/\s+/g, '_')}_invoice.txt`, content);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eTIMS_Export_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#141414]" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      <Toaster position="top-center" richColors />
      {/* Top Navigation */}
      <nav className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 print:hidden">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-600/20">P</div>
            <h1 className="text-lg font-display font-bold tracking-tight text-slate-900">ProfitPulse</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-1">
            <NavLink label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
            <NavLink label="Projects" active={activeTab === 'Projects'} onClick={() => setActiveTab('Projects')} />
            <NavLink label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
            <NavLink label="Team" active={activeTab === 'Team'} onClick={() => setActiveTab('Team')} />
            <NavLink label="Billing" active={activeTab === 'Billing'} onClick={() => setActiveTab('Billing')} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setFocusMode(!focusMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              focusMode ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            <Zap size={14} fill={focusMode ? "currentColor" : "none"} />
            <span className="hidden sm:inline">Focus Mode</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/5 transition-all">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="bg-transparent outline-none text-xs font-medium w-40 text-slate-600"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="h-6 w-px bg-slate-200"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-none mb-1">{user.displayName || 'User'}</p>
              <p className="text-[10px] font-medium text-slate-400 leading-none">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white hidden lg:flex flex-col p-6 print:hidden">
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <ActionButton icon={<Plus size={16} />} label="New Project" onClick={() => setShowProjectForm(true)} primary />
                <ActionButton icon={<Clock size={16} />} label="Log Time" onClick={() => setShowTimeLogForm(true)} />
                <ActionButton icon={<Upload size={16} />} label="Import CSV" onClick={() => setShowCsvImport(true)} />
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">System Status</h4>
              <div className="space-y-3">
                <StatusItem label="Database" status="online" />
                <StatusItem label="Auth Service" status="online" />
                <StatusItem label="GitHub API" status="online" />
              </div>
            </div>

            <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-4">Project Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-brand-700">Active</span>
                  <span className="text-xs font-bold text-brand-900">{projects.filter(p => p.status === 'active').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-brand-700">Completed</span>
                  <span className="text-xs font-bold text-brand-900">{projects.filter(p => p.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-brand-700">On Hold</span>
                  <span className="text-xs font-bold text-brand-900">{projects.filter(p => p.status === 'on-hold').length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity size={12} />
              <p className="text-[10px] font-medium uppercase tracking-widest">
                Synced {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 bg-slate-50/50">
            {activeTab === 'Dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatCard 
                    label="Total Revenue" 
                    value={formatCurrency(stats.totalEarned)} 
                    icon={<DollarSign size={24} />}
                    trend="+12.4%"
                    positive
                    color="bg-brand-500"
                  />
                  <StatCard 
                    label="Billable Hours" 
                    value={formatHours(stats.totalHours)} 
                    icon={<Clock size={24} />}
                    trend="+4.2h"
                    positive
                    color="bg-accent-500"
                  />
                  <StatCard 
                    label="Avg. Efficiency" 
                    value={`${formatCurrency(stats.avgHourlyRate)}/hr`} 
                    icon={<Activity size={24} />}
                    trend="-2.1%"
                    negative={stats.avgHourlyRate < 7500}
                    color="bg-emerald-500"
                  />
                  <StatCard 
                    label="Active Projects" 
                    value={stats.projectCount.toString()} 
                    icon={<Terminal size={24} />}
                    trend="Stable"
                    color="bg-indigo-500"
                  />
                </div>

                {/* Analytics Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-display font-bold text-slate-900">Performance Analytics</h3>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all text-slate-400 hover:text-slate-600">Week</button>
                      <button className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all bg-brand-600 text-white shadow-md shadow-brand-600/20">Month</button>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-8 rounded-3xl card-shadow">
                    <Analytics projects={projects} />
                  </div>
                </div>
              </>
            )}

            {/* Projects Section - GRID LAYOUT */}
            {(activeTab === 'Dashboard' || activeTab === 'Projects') && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-bold text-slate-900">
                      {activeTab === 'Dashboard' ? 'Active Projects' : 'All Projects'}
                      {focusMode && <span className="ml-3 text-xs bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">Focus Active</span>}
                    </h3>
                    <p className="text-sm text-slate-500">Manage and track your ongoing technical nodes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={exportETIMS}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Download size={18} />
                      <span>eTIMS Export</span>
                    </button>
                    <button 
                      onClick={() => setShowProjectForm(true)}
                      className="flex items-center gap-2 btn-primary"
                    >
                      <Plus size={18} />
                      <span>New Project</span>
                    </button>
                  </div>
                </div>
                
                {filteredProjects.length > 0 ? (
                  <div className="space-y-12">
                    {(() => {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const today = now.getTime();
                      const tomorrow = today + 86400000;
                      const nextWeek = today + 86400000 * 7;
                      const in48Hours = today + 86400000 * 2;

                      const groups = [
                        { label: 'Due Today', filter: (p: any) => p.deadline && p.deadline >= today && p.deadline < tomorrow },
                        { label: 'Due Tomorrow', filter: (p: any) => p.deadline && p.deadline >= tomorrow && p.deadline < tomorrow + 86400000 },
                        { label: 'Due This Week', filter: (p: any) => p.deadline && p.deadline >= tomorrow + 86400000 && p.deadline < nextWeek },
                        { label: 'Upcoming', filter: (p: any) => p.deadline && p.deadline >= nextWeek },
                        { label: 'Overdue', filter: (p: any) => p.deadline && p.deadline < today && p.status !== 'completed' },
                        { label: 'No Deadline', filter: (p: any) => !p.deadline }
                      ];

                      let projectsToDisplay = filteredProjects.filter(p => activeTab === 'Dashboard' ? p.status === 'active' : true);

                      if (focusMode) {
                        projectsToDisplay = projectsToDisplay.filter(p => 
                          p.status === 'active' && 
                          p.deadline && 
                          p.deadline < in48Hours
                        );
                      }

                      return groups.map(group => {
                        const groupProjects = projectsToDisplay.filter(group.filter);
                        if (groupProjects.length === 0) return null;

                        return (
                          <div key={group.label} className="space-y-6">
                            <div className="flex items-center gap-4">
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{group.label}</h4>
                              <div className="h-px w-full bg-slate-100"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {groupProjects.map(project => (
                                <ProjectListItem 
                                  key={project.id} 
                                  project={project} 
                                  transactions={transactions}
                                  onInvoice={() => setSelectedProjectForInvoice(project)}
                                  onDelete={() => deleteProject(project.id)}
                                  onEdit={() => setEditingProject(project)}
                                  onShare={() => handleShareProject(project)}
                                  onStatusChange={(status) => updateProjectStatus(project.id, status)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="p-20 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Briefcase size={24} className="text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-display font-bold text-slate-900 uppercase tracking-widest">No projects found</p>
                      <p className="text-sm text-slate-400">Try adjusting your search or create a new project to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Analytics' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-display font-bold text-slate-900">Advanced Analytics</h3>
                <div className="bg-white border border-slate-200 p-8 rounded-3xl card-shadow">
                  <Analytics projects={projects} />
                </div>
              </div>
            )}

            {activeTab === 'Team' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-bold text-slate-900">Team Resources</h3>
                    <p className="text-sm text-slate-500">Manage your collaborators and technical experts</p>
                  </div>
                  <button 
                    onClick={() => {
                      const name = window.prompt('Enter resource name:');
                      const role = window.prompt('Enter role:');
                      const email = window.prompt('Enter email:');
                      if (name && role && email) {
                        setTeamMembers([...teamMembers, { id: Math.random().toString(), name, role, email }]);
                      }
                    }}
                    className="flex items-center gap-2 btn-primary"
                  >
                    <Plus size={18} />
                    <span>Add Resource</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Manual Team Members */}
                  {teamMembers.map(member => (
                    <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{member.name}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{member.role}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Derived Team Resources from Projects */}
                  {derivedTeamResources.map((resource, idx) => (
                    <div key={`derived-${idx}`} className="bg-white p-6 rounded-[2rem] border border-brand-100 shadow-sm flex items-center gap-4 border-l-4 border-l-brand-500">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                        {resource.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{resource.name}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Project Resource</p>
                        <p className="text-xs text-slate-500">Working on: {resource.projects.join(', ')}</p>
                      </div>
                    </div>
                  ))}

                  {teamMembers.length === 0 && derivedTeamResources.length === 0 && (
                    <div className="col-span-full p-20 bg-white border border-dashed border-slate-200 rounded-3xl text-center space-y-4">
                      <Users size={32} className="mx-auto text-slate-200" />
                      <p className="text-sm text-slate-400">No team resources added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Billing' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-display font-bold text-slate-900">Billing & Payments</h3>
                    <p className="text-sm text-slate-500">Manage your invoices and track incoming revenue</p>
                  </div>
                  <button 
                    onClick={() => setShowTransactionImport(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    <FileUp size={14} />
                    Import Transactions
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Payments</p>
                      <h4 className="text-2xl font-display font-bold text-slate-900">
                        {formatCurrency(
                          projects.reduce((sum, p) => sum + p.budget + (p.resourceCosts?.reduce((s, r) => s + r.amount, 0) || 0), 0) - 
                          transactions.reduce((sum, t) => sum + t.amount, 0)
                        )}
                      </h4>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Received Payments</p>
                      <h4 className="text-2xl font-display font-bold text-slate-900">
                        {formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
                      </h4>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Valuation</p>
                      <h4 className="text-2xl font-display font-bold text-slate-900">
                        {formatCurrency(projects.reduce((sum, p) => sum + p.budget + (p.resourceCosts?.reduce((s, r) => s + r.amount, 0) || 0), 0))}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Project</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Project Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {projects.map(p => (
                        <tr key={p.id}>
                          <td className="px-8 py-4 text-sm font-bold text-slate-900">{p.name}</td>
                          <td className="px-8 py-4 text-sm text-slate-500">{p.client}</td>
                          <td className="px-8 py-4 text-sm font-mono font-bold text-slate-900">
                            {formatCurrency(p.budget + (p.resourceCosts?.reduce((s, r) => s + r.amount, 0) || 0))}
                          </td>
                          <td className="px-8 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              p.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            {(() => {
                              const isLinked = transactions.some(t => t.projectId === p.id);
                              const status = isLinked ? p.paymentStatus : 'unpaid';
                              return (
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                  status === 'paid' ? "bg-brand-50 text-brand-600" : "bg-amber-50 text-amber-600"
                                )}>
                                  {status}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-8 py-4">
                            <button 
                              onClick={() => {
                                // Find the first unassigned transaction or just open the list?
                                // Actually, let's just scroll them to the transactions list or open a modal.
                                // Better: open a modal to select a transaction to link to THIS project.
                                setSelectedProjectForLinking(p);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700 underline underline-offset-4"
                            >
                              Link Transaction
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {transactions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Recent Transaction Imports</h4>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Linked Project</th>
                            <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {transactions.map(t => (
                            <tr key={t.id}>
                              <td className="px-8 py-4 text-sm text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                              <td className="px-8 py-4 text-sm text-slate-900">{t.description}</td>
                              <td className="px-8 py-4 text-sm font-mono font-bold text-emerald-600">+{formatCurrency(t.amount)}</td>
                              <td className="px-8 py-4 text-xs font-medium text-slate-500">
                                {t.projectId ? projects.find(p => p.id === t.projectId)?.name : 'Unassigned'}
                              </td>
                              <td className="px-8 py-4 flex items-center gap-4">
                                <button 
                                  onClick={() => setAssigningTransaction(t)}
                                  className="text-[10px] font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700 underline underline-offset-4"
                                >
                                  {t.projectId ? 'Reassign' : 'Assign'}
                                </button>
                                {t.projectId && (
                                  <button 
                                    onClick={() => handleUnlinkTransaction(t.id)}
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 underline underline-offset-4"
                                  >
                                    Unlink
                                  </button>
                                )}
                                <button 
                                  onClick={() => setTransactionToDelete(t.id)}
                                  className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                  title="Delete Transaction"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {assigningTransaction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-display font-bold text-slate-900">Assign Transaction</h3>
                  <p className="text-xs text-slate-500">Link {formatCurrency(assigningTransaction.amount)} to a project</p>
                </div>
                <button onClick={() => setAssigningTransaction(null)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-2">
                {projects.length > 0 ? projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAssignTransaction(p.id)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-brand-700">{p.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">{p.client}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500" />
                  </button>
                )) : (
                  <p className="text-center text-slate-400 py-8">No projects available to assign.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedProjectForLinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-display font-bold text-slate-900">Link Transaction</h3>
                  <p className="text-xs text-slate-500">Select a transaction to link to {selectedProjectForLinking.name}</p>
                </div>
                <button onClick={() => setSelectedProjectForLinking(null)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-2">
                {transactions.filter(t => !t.projectId).length > 0 ? transactions.filter(t => !t.projectId).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleLinkTransactionToProject(t.id)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-brand-700">{formatCurrency(t.amount)}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 truncate max-w-[200px]">{t.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500" />
                  </button>
                )) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-slate-400">No unassigned transactions available.</p>
                    <button 
                      onClick={() => {
                        setSelectedProjectForLinking(null);
                        setShowTransactionImport(true);
                      }}
                      className="text-xs font-bold uppercase tracking-widest text-brand-600 hover:text-brand-700"
                    >
                      Import New Transactions
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTransactionImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                    <FileUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-slate-900">Import Transactions</h3>
                    <p className="text-xs text-slate-500">Paste M-Pesa or Bank statements to track payments</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTransactionImport(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Statement Text</label>
                  <textarea
                    placeholder="Paste transaction messages here (M-Pesa, Bank, etc.)..."
                    rows={8}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium resize-none"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 italic">Supports currency formats like Ksh 1,200.00, $50.00, KES 5,000.00</p>
                </div>
                <button 
                  onClick={handleImportTransactions}
                  disabled={!importText}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                >
                  Process Statement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showProjectForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50">
            <ProjectForm onAdd={addProject} onClose={() => setShowProjectForm(false)} />
          </motion.div>
        )}
        {showTimeLogForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50">
            <TimeLogForm projects={projects} onLog={logTime} onClose={() => setShowTimeLogForm(false)} />
          </motion.div>
        )}
        {showCsvImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50">
            <CsvImport onImport={handleImport} onClose={() => setShowCsvImport(false)} />
          </motion.div>
        )}
        {selectedProjectForInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50">
            <InvoiceModal project={selectedProjectForInvoice} onClose={() => setSelectedProjectForInvoice(null)} />
          </motion.div>
        )}
        {editingProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50">
            <ProjectForm 
              initialData={editingProject}
              onUpdate={(id, data) => {
                updateProject(id, data);
                setEditingProject(null);
              }}
              onAdd={addProject}
              onClose={() => setEditingProject(null)} 
            />
          </motion.div>
        )}
        {transactionToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">Delete Transaction?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone. The transaction will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTransactionToDelete(null)}
                  className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteTransaction(transactionToDelete)}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-xl",
      active ? "text-brand-600 bg-brand-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
    )}>
      {label}
    </button>
  );
}

function ActionButton({ icon, label, onClick, primary }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]",
        primary ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusItem({ label, status }: { label: string, status: 'online' | 'offline' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
        <div className={cn("w-1.5 h-1.5 rounded-full", status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{status}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, positive, negative, color }: { label: string, value: string, icon: React.ReactNode, trend: string, positive?: boolean, negative?: boolean, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 duration-300", color)}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
          positive && "bg-emerald-50 text-emerald-600",
          negative && "bg-rose-50 text-rose-600",
          !positive && !negative && "bg-slate-50 text-slate-600"
        )}>
          {positive && <ArrowUpRight size={12} />}
          {negative && <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">{label}</p>
        <h3 className="text-lg sm:text-xl font-display font-bold tracking-tight text-slate-900 truncate">{value}</h3>
      </div>
    </div>
  );
}

const ProjectListItem: React.FC<{ 
  project: Project, 
  transactions: Transaction[],
  onInvoice: () => void,
  onDelete: () => void,
  onEdit: () => void,
  onShare: () => void,
  onStatusChange: (status: Project['status']) => void
}> = ({ project, transactions, onInvoice, onDelete, onEdit, onShare, onStatusChange }) => {
  const resourceTotal = project.resourceCosts?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const totalBudget = project.budget + resourceTotal;
  const ehr = project.actualHours > 0 ? totalBudget / project.actualHours : 0;
  
  // Efficiency Tiers
  const isGold = ehr > 15000;
  const isBlue = ehr >= 5000 && ehr <= 15000;
  const isRed = ehr < 5000;

  // Burn-up Calculation
  const hourProgress = project.estimatedHours > 0 ? (project.actualHours / project.estimatedHours) * 100 : 0;
  const burnColor = hourProgress > 100 ? "bg-rose-500" : hourProgress > 80 ? "bg-orange-500" : "bg-emerald-500";

  const deadlineDate = project.deadline ? new Date(project.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate.getTime() < Date.now() && project.status !== 'completed';

  return (
    <div className={cn(
      "bg-white border p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 group flex flex-col h-full relative overflow-hidden",
      isGold ? "border-amber-200 border-t-amber-500 border-t-4" : 
      isRed ? "border-rose-200 border-t-rose-500 border-t-4" : 
      "border-slate-100 border-t-brand-500 border-t-4"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700 opacity-50"></div>
      
      <div className="relative z-10 flex justify-between items-start mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-bold text-xl text-slate-900 group-hover:text-brand-600 transition-colors">{project.name}</h4>
            {project.githubRepo && (
              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <Github size={10} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{project.client}</p>
            {(() => {
              const isLinked = transactions.some(t => t.projectId === project.id);
              const status = isLinked ? project.paymentStatus : 'unpaid';
              return (
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest",
                  status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select 
            value={project.status}
            onChange={(e) => onStatusChange(e.target.value as Project['status'])}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm outline-none cursor-pointer transition-all",
              project.status === 'active' ? "bg-emerald-500 text-white border-emerald-400" : 
              project.status === 'completed' ? "bg-brand-600 text-white border-brand-500" :
              "bg-slate-100 text-slate-500 border-slate-200"
            )}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-transparent hover:border-brand-100 shadow-sm hover:shadow-md"
              title="Edit Project"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-md"
              title="Delete Project"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-transparent hover:border-brand-100 shadow-sm hover:shadow-md"
              title="Invite Collaborator"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 grid grid-cols-2 gap-8 py-8 border-y border-slate-50 mb-8">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valuation</p>
          <p className="text-lg font-display font-bold text-slate-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="space-y-1.5 text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Efficiency</p>
          <p className={cn(
            "font-display font-bold text-lg", 
            isGold ? "text-amber-500" : isRed ? "text-rose-500" : "text-brand-600"
          )}>
            {formatCurrency(ehr)}/hr
          </p>
        </div>
      </div>

      {project.achievements && (
        <div className="relative z-10 mb-8 p-4 bg-brand-50/50 rounded-2xl border border-brand-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2 flex items-center gap-2">
            <TrendingUp size={12} />
            Achievements & Learnings
          </p>
          <p className="text-xs text-slate-600 leading-relaxed italic">
            "{project.achievements}"
          </p>
        </div>
      )}

      <div className="relative z-10 mb-8 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Burn-up (Hours)</span>
            <span className={cn("font-mono", hourProgress > 100 ? "text-rose-600" : "text-slate-900")}>
              {project.actualHours}h / {project.estimatedHours}h
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-1000", burnColor)}
              style={{ width: `${Math.min(100, hourProgress)}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Timeline</span>
            <span className="text-slate-900">{deadlineDate ? deadlineDate.toLocaleDateString() : 'No Deadline'}</span>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-600 animate-pulse">
              <AlertCircle size={12} />
              <span>Overdue</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-colors",
            hourProgress > 100 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-slate-50 border-slate-100 text-slate-600"
          )}>
            <Clock size={14} />
            <span className="text-sm font-bold font-mono">
              {formatHours(project.actualHours)}
            </span>
          </div>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onInvoice();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20 active:scale-95"
        >
          <FileText size={16} />
          Invoice
        </button>
      </div>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

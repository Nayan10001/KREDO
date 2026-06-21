import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, LayoutDashboard, Network, History, Library,
    Menu, X, Github, ChevronRight
} from 'lucide-react';
import KredoLogo from './shared/kredo-logo';
import { KredoView } from '../../lib/kredo/types';

interface AppShellProps {
    view: KredoView;
    onView: (v: KredoView) => void;
    children: React.ReactNode;
}

export default function AppShell({ view, onView, children }: AppShellProps) {
    const [mobileOpen, setMobileOpen] = useState(false);

    // Nav items mapping
    const navItems = [
        { id: 'verify' as KredoView, label: 'Verify', icon: ShieldCheck, desc: 'Run the 7-agent pipeline' },
        { id: 'dashboard' as KredoView, label: 'Dashboard', icon: LayoutDashboard, desc: 'Platform analytics' },
        { id: 'agents' as KredoView, label: 'Agents', icon: Network, desc: 'Explore the pipeline' },
        { id: 'history' as KredoView, label: 'History', icon: History, desc: 'Past fact-checks' },
        { id: 'sources' as KredoView, label: 'Sources', icon: Library, desc: 'Credibility library' },
    ];

    const getBreadcrumbLabel = (v: KredoView) => {
        const found = navItems.find(item => item.id === v);
        return found ? found.label : v;
    };

    const handleNavClick = (v: KredoView) => {
        onView(v);
        setMobileOpen(false);
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border/30">
            {/* Header/Logo */}
            <div className="h-16 flex items-center px-6 border-b border-sidebar-border/20">
                <KredoLogo size={28} withWordmark={true} />
            </div>

            {/* Navigation links */}
            <nav className="flex-1 py-6 px-3 space-y-1.5" aria-label="Sidebar navigation">
                {navItems.map(item => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none group ${
                                isActive
                                    ? 'bg-emerald-500/12 text-emerald-300'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            }`}
                        >
                            {/* Active bar indicator */}
                            {isActive && (
                                <motion.span
                                    layoutId="sidebar-active"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r bg-emerald-400"
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                            )}

                            <item.icon className={`h-4.5 w-4.5 transition-colors ${
                                isActive ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
                            }`} />
                            <div className="flex flex-col items-start leading-none">
                                <span>{item.label}</span>
                                <span className="text-[9px] text-muted-foreground/50 font-normal mt-0.5">
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </nav>

            {/* Sidebar Footer status card */}
            <div className="p-4 m-3 rounded-xl bg-muted/40 ring-1 ring-inset ring-border space-y-3">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-kredo-pulse-dot" />
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-300/80">
                        Pipeline online
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2.5 text-[10px] font-mono text-muted-foreground/60">
                    <div>
                        <span className="block text-muted-foreground/40 text-[9px] uppercase tracking-wider">checks</span>
                        <span className="text-foreground font-semibold">1,248</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground/40 text-[9px] uppercase tracking-wider">latency</span>
                        <span className="text-foreground font-semibold">6.4s</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
            {/* 1. Persistent Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0 z-20">
                <SidebarContent />
            </aside>

            {/* 2. Mobile drawer layout */}
            <AnimatePresence>
                {mobileOpen && (
                    <div className="lg:hidden fixed inset-0 z-40">
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-background/85 backdrop-blur-sm"
                        />

                        {/* Drawer body */}
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
                            className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl overflow-hidden"
                        >
                            <div className="h-full relative bg-sidebar">
                                <SidebarContent />

                                {/* Close Button inside mobile drawer header */}
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="absolute right-4 top-4 h-8 w-8 rounded-lg hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer select-none border border-border"
                                >
                                    <X className="h-4.5 w-4.5" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. Main column container */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-y-auto">
                {/* Sticky Header */}
                <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/40 bg-background/85 backdrop-blur-md">
                    {/* Left breadcrumb (Desktop) / Hamburger (Mobile) */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden h-9 w-9 rounded-lg hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer select-none border border-border bg-card/40"
                            aria-label="Open sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Logo on mobile header */}
                        <div className="lg:hidden flex items-center">
                            <KredoLogo size={24} withWordmark={false} />
                        </div>

                        {/* Breadcrumbs for desktop */}
                        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 select-none">
                            <span>Workspace</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="text-foreground/80 font-bold">
                                {getBreadcrumbLabel(view)}
                            </span>
                        </div>
                    </div>

                    {/* Right side utilities */}
                    <div className="flex items-center gap-3">
                        {/* Status Uptime Pill */}
                        <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25 select-none text-[9px] font-mono tracking-wider font-semibold text-emerald-400">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-kredo-pulse-dot" />
                            <span>pipeline · 99.4% uptime</span>
                        </div>

                        {/* GitHub link */}
                        <a
                            href="https://github.com/Nayan10001/KREDO"
                            target="_blank"
                            rel="noreferrer"
                            className="h-9 w-9 rounded-lg hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition border border-border bg-card/25"
                            title="View Github source repository"
                        >
                            <Github className="h-4.5 w-4.5" />
                        </a>
                    </div>
                </header>

                {/* View main content area */}
                <main id="main-content" className="flex-1 relative flex flex-col justify-start">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="flex-1 w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

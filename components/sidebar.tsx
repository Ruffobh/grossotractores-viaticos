'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './sidebar.module.css' // We'll move styles here
import {
    LayoutDashboard,
    PlusCircle,
    FileText,
    Users,
    Building,
    LogOut,
    Menu,
    X
} from 'lucide-react'

type SidebarProps = {
    profile: any
    role: string
}

export function Sidebar({ profile, role }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const toggleSidebar = () => setIsOpen(!isOpen)
    const closeSidebar = () => setIsOpen(false)

    // Helper to determine active link
    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

    return (
        <>
            {/* Mobile Header / Hamburger */}
            <div className={styles.mobileHeader}>
                <div className={styles.brandMobile}>
                    <span className={styles.brandHighlight}>GROSSO</span> TRACTORES
                </div>
                <button onClick={toggleSidebar} className={styles.hamburger}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay for mobile */}
            {isOpen && <div className={styles.overlay} onClick={closeSidebar} />}

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <span className={styles.brandHighlight}>GROSSO</span> TRACTORES
                    </div>
                </div>

                <nav className={styles.nav}>
                    <Link
                        href="/"
                        className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}
                        onClick={closeSidebar}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        href="/expenses/new"
                        className={`${styles.navItem} ${pathname === ('/expenses/new') ? styles.active : ''}`}
                        onClick={closeSidebar}
                    >
                        <PlusCircle size={20} />
                        <span>Nuevo Gasto</span>
                    </Link>

                    <Link
                        href="/expenses"
                        className={`${styles.navItem} ${isActive('/expenses') && pathname !== '/expenses/new' ? styles.active : ''}`}
                        onClick={closeSidebar}
                    >
                        <FileText size={20} />
                        <span>Comprobantes</span>
                    </Link>

                    {role === 'admin' && (
                        <>
                            <div className={styles.divider} />
                            <Link
                                href="/admin/users"
                                className={`${styles.navItem} ${isActive('/admin/users') ? styles.active : ''}`}
                                onClick={closeSidebar}
                            >
                                <Users size={20} />
                                <span>Usuarios</span>
                            </Link>
                            {/* <Link
                                href="/admin/branches"
                                className={`${styles.navItem} ${isActive('/admin/branches') ? styles.active : ''}`}
                                onClick={closeSidebar}
                            >
                                <Building size={20} />
                                <span>Sucursales</span>
                            </Link> */}
                        </>
                    )}
                </nav>

                <div className={styles.footer}>
                    <div className={styles.userProfile}>
                        <div className={styles.avatar}>
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>
                                {profile?.full_name || 'Usuario'}
                            </span>
                            <span className={styles.userRole}>
                                {role === 'admin' ? 'Administrador' : (role === 'manager' || role === 'branch_manager') ? 'Encargado' : 'Usuario'}
                            </span>
                        </div>
                    </div>

                    <form action="/auth/signout" method="post">
                        <button type="submit" className={styles.logoutBtn}>
                            <LogOut size={16} />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </aside>
        </>
    )
}

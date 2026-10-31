"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

export interface Links {
  label: string;
  href?: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  badge?: string;
  sublabel?: string;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const reduceMotion = useReducedMotion();

  return (
    <>
      <motion.div
        className={cn(
          "h-full px-3.5 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[290px] shrink-0 overflow-x-hidden",
          className
        )}
        animate={{
          width: animate ? (open ? "290px" : "64px") : "290px",
        }}
        transition={reduceMotion ? { duration: 0 } : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const reduceMotion = useReducedMotion();

  return (
    <>
      <div
        className={cn(
          "h-12 px-4 py-3 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { x: "-100%", opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "-100%", opacity: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.3,
                      ease: "easeInOut",
                    }
              }
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-[#070709] p-6 sm:p-8 z-[100] flex flex-col justify-between overflow-y-auto",
                className
              )}
            >
              <div
                className="absolute right-6 top-6 sm:right-8 sm:top-8 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setOpen(!open)}
              >
                <IconX size={20} />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  active = false,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const { open, animate } = useSidebar();
  const reduceMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (link.onClick) {
      link.onClick(e);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <a
      href={link.href || "#"}
      onClick={handleClick}
      title={!open ? link.label : undefined}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2 px-2.5 rounded-lg transition-colors cursor-pointer",
        active
          ? "bg-white/[0.08] text-white font-medium"
          : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
        className
      )}
      {...props}
    >
      <div className="shrink-0 flex items-center justify-center">
        {link.icon}
      </div>

      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={reduceMotion ? { duration: 0 } : undefined}
        className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap min-w-0"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium tracking-tight truncate group-hover/sidebar:translate-x-0.5 transition duration-150">
            {link.label}
          </span>
          {link.sublabel && (
            <span className="text-[10px] text-neutral-500 truncate leading-none mt-0.5">
              {link.sublabel}
            </span>
          )}
        </div>
        {link.badge && (
          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-accent-soft text-accent border border-accent/20">
            {link.badge}
          </span>
        )}
      </motion.div>
    </a>
  );
};

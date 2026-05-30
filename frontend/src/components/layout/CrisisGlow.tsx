/* Renders a pulsing red border glow across the viewport when critical alerts are active. */
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "@/store/simulationStore";

export function CrisisGlow() {
  const { criticalAlerts } = useSimulationStore();
  const active = criticalAlerts.length > 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="crisis-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 pointer-events-none z-50"
          style={{ boxShadow: "inset 0 0 90px rgba(239,68,68,0.16), inset 0 0 3px rgba(239,68,68,0.4)" }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "inset 0 0 130px rgba(239,68,68,0.1)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

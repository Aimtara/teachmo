import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DailyTipCarousel from './DailyTipCarousel';

export default function DailyTipModal({ tips, children, isLoading, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DailyTipCarousel tips={tips} children={children} isLoading={isLoading} />
          
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
             <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="bg-white/80 hover:bg-white rounded-full shadow-lg text-gray-700 w-8 h-8"
              >
                <X className="w-5 h-5" />
              </Button>
          </div>

          <div className="text-center mt-4">
            <Button variant="link" onClick={onClose} className="text-white/80 hover:text-white">
              Remind me later
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
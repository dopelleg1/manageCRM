import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Trash2, X } from 'lucide-react';

const DebugPanel = ({ isOpen, onClose, logs, onClear }) => {
    const endRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        🔧 Console di Debug Avanzata
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden rounded-md bg-slate-950 border border-slate-800 p-4 font-mono text-xs shadow-inner flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {logs.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">
                                Nessun log registrato. Attiva il debug e interagisci con l'app.
                            </div>
                        )}
                        {logs.map((log, index) => (
                            <div key={index} className="border-l-2 pl-3 py-1 transition-all hover:bg-slate-900/50 rounded-r" 
                                style={{ borderColor: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#f87171' : '#facc15' }}>
                                <div className="flex items-center gap-3 text-slate-400 mb-1">
                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                        {format(log.timestamp, 'HH:mm:ss.SSS')}
                                    </span>
                                    <span className={`font-bold text-sm ${
                                        log.type === 'success' ? 'text-green-400' :
                                        log.type === 'error' ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {log.step}
                                    </span>
                                </div>
                                <div className="text-slate-300 pl-1 break-all whitespace-pre-wrap bg-slate-900/30 p-2 rounded border border-slate-800/50">
                                    {typeof log.details === 'object' 
                                        ? JSON.stringify(log.details, null, 2)
                                        : String(log.details)}
                                </div>
                            </div>
                        ))}
                        <div ref={endRef} />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <div className="text-xs text-slate-500 self-center">
                        {logs.length} eventi registrati
                    </div>
                    <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={onClear}>
                            <Trash2 className="w-4 h-4 mr-2" /> Pulisci
                        </Button>
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            <X className="w-4 h-4 mr-2" /> Chiudi
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DebugPanel;
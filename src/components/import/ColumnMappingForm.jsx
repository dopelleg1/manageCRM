import React, { useState, useEffect, useMemo } from 'react';
import { getTableSchema, validateAndPreviewBatch } from '@/utils/csvImportService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, AlertCircle, Check, Info, AlertTriangle, Phone, Save, RotateCcw } from "lucide-react";
import { createColumnMatcher } from '@/utils/columnNormalization';
import { Card } from "@/components/ui/card";
import { saveMappingForTable, getMappingForTable, clearMappingForTable } from '@/services/mappingPersistenceService';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const ColumnMappingForm = ({ tableName, csvHeaders, onMappingChange, rawData, selectedType, onValidationUpdate }) => {
  const schema = useMemo(() => getTableSchema(tableName), [tableName]);
  const [mapping, setMapping] = useState({});
  const [previewRows, setPreviewRows] = useState([]);
  const [phoneStats, setPhoneStats] = useState({ valid: 0, invalid: 0 });
  const [isMappingSaved, setIsMappingSaved] = useState(false);
  const { toast } = useToast();

  // Filter fields based on selectedType
  const availableFields = useMemo(() => {
    if (!schema) return [];
    let fields = schema.fields;
    if (selectedType) {
        fields = fields.filter(f => f.key !== 'type');
    }
    fields = fields.filter(f => !['numero', 'id', 'record_id'].includes(f.key));
    return fields;
  }, [schema, selectedType]);

  // Initial Load: Check Persistence then Auto-Map
  useEffect(() => {
    if (schema && csvHeaders.length > 0) {
       // 1. Try Load Saved Mapping
       const savedMapping = getMappingForTable(tableName);
       
       if (savedMapping && Object.keys(savedMapping).length > 0) {
           setMapping(savedMapping);
           onMappingChange(savedMapping);
           setIsMappingSaved(true);
           toast({ description: "Mappatura precedente caricata." });
       } else {
           // 2. Auto Map Logic
           const initialMapping = {};
           const matcher = createColumnMatcher(availableFields);
           
           csvHeaders.forEach(header => {
               const match = matcher(header);
               if (match) {
                   initialMapping[header] = match;
               }
           });
           setMapping(initialMapping);
           onMappingChange(initialMapping);
       }
    }
  }, [schema, csvHeaders, availableFields, tableName]);

  // Update Preview & Auto-Save (Debounced? Or just save on confirm outside?)
  // For now we save when user proceeds, but we can also offer manual save/reset
  useEffect(() => {
      if (!schema || !rawData || rawData.length === 0) return;
      
      const rows = validateAndPreviewBatch(tableName, rawData.slice(0, 10), mapping);
      setPreviewRows(rows);
      
      let pValid = 0;
      let pInvalid = 0;
      
      rows.forEach(r => {
          // Verify stats only for primary phone
          const hasPhoneIssue = r._warnings.some(w => w.includes('telefono'));
          const hasPhoneError = r._errors.some(e => e.includes('telefono'));
          const phoneMapped = Object.keys(mapping).some(k => mapping[k] === 'telefono' || mapping[k] === 'telefono_proprietario');
          if (phoneMapped) {
              if (hasPhoneIssue || hasPhoneError) pInvalid++; else pValid++;
          }
      });
      setPhoneStats({ valid: pValid, invalid: pInvalid });

      if (onValidationUpdate) {
          onValidationUpdate({
              previewCount: rows.length,
              errorCount: rows.filter(r => r._status === 'error').length
          });
      }

  }, [mapping, rawData, tableName, schema]);

  const handleSelectChange = (header, fieldKey) => {
    const newMapping = { ...mapping, [header]: fieldKey };
    if (fieldKey === 'ignore') {
        delete newMapping[header];
    }
    setMapping(newMapping);
    onMappingChange(newMapping);
    setIsMappingSaved(false); 
  };

  const handleResetMapping = () => {
      clearMappingForTable(tableName);
      setMapping({});
      onMappingChange({});
      setIsMappingSaved(false);
      toast({ description: "Mappatura resettata." });
  };

  const handleManualSave = () => {
      saveMappingForTable(tableName, mapping);
      setIsMappingSaved(true);
      toast({ title: "Mappatura salvata", className: "bg-green-50 border-green-200" });
  };

  const getTypeLabel = (type) => {
      switch(type) {
          case 'text': return 'Testo';
          case 'numeric': return 'Numero';
          case 'integer': return 'Intero';
          case 'date': return 'Data';
          case 'boolean': return 'Sì/No';
          case 'relation': return 'Relazione';
          default: return type;
      }
  };

  if (!schema) return <div>Schema non trovato per {tableName}</div>;

  return (
    <div className="flex flex-col h-full gap-4">
      {selectedType && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md flex items-center text-sm">
              <Info className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                  <span className="font-semibold">Importazione attiva: </span>
                  {selectedType === 'acquirente' ? 'Acquirenti' : 'Venditori'}.
                  <span className="block text-xs mt-1 text-blue-600">Il campo "type" verrà impostato automaticamente.</span>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        
        {/* Left: Mapping Controls */}
        <div className="border rounded-md flex flex-col overflow-hidden">
            <div className="bg-muted p-3 border-b font-medium text-sm flex justify-between items-center">
                <span>Mappatura Colonne CSV</span>
                <div className="flex gap-2">
                    <Button variant="ghost" size="xs" onClick={handleResetMapping} title="Resetta mappatura salvata">
                        <RotateCcw className="h-3 w-3 mr-1"/> Reset
                    </Button>
                    {isMappingSaved ? (
                         <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 flex items-center gap-1">
                             <Check className="h-3 w-3" /> Salvata
                         </Badge>
                    ) : (
                         <Button variant="ghost" size="xs" onClick={handleManualSave} title="Salva per futuri import">
                            <Save className="h-3 w-3 mr-1"/> Salva
                        </Button>
                    )}
                </div>
            </div>
            <ScrollArea className="flex-1 p-3 bg-background">
                <div className="space-y-3">
                    {csvHeaders.map(header => {
                        const isMapped = !!mapping[header];
                        const mappedFieldKey = mapping[header];
                        const mappedField = availableFields.find(f => f.key === mappedFieldKey);

                        return (
                            <div key={header} className={`flex flex-col gap-2 p-2 rounded border transition-colors ${isMapped ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent hover:border-slate-100'}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-[120px] max-w-[150px]">
                                        <span className="text-sm font-medium truncate" title={header}>{header}</span>
                                        <span className="text-xs text-muted-foreground truncate italic">
                                            "{rawData[0]?.[header] || ''}"
                                        </span>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Select 
                                        value={mapping[header] || 'ignore'} 
                                        onValueChange={(val) => handleSelectChange(header, val)}
                                    >
                                        <SelectTrigger className={`w-[220px] h-8 text-xs ${isMapped ? 'border-green-500 bg-white' : ''}`}>
                                            <SelectValue placeholder="Ignora" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            <SelectItem value="ignore">-- Ignora --</SelectItem>
                                            {availableFields.map(field => (
                                                <SelectItem key={field.key} value={field.key} className="text-xs">
                                                    <span className="font-medium">{field.label}</span>
                                                    <span className="text-muted-foreground ml-2">
                                                        [{getTypeLabel(field.type)}]
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isMapped && mappedField && (
                                     <div className="ml-auto text-[10px] text-green-600 flex items-center">
                                         <Check className="h-3 w-3 mr-1"/> Mappato su {mappedField.label}
                                     </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>

        {/* Right: Validation Preview */}
        <div className="flex flex-col gap-4 h-full overflow-hidden">
             
             {/* Stats Header */}
             <div className="border rounded-md p-3 bg-slate-50 shrink-0 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Anteprima Validazione (Prime 10 righe)</span>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                            {previewRows.length} Righe
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {previewRows.filter(r => r._status === 'valid').length} Valide
                        </Badge>
                        {previewRows.some(r => r._status === 'error') && (
                            <Badge variant="destructive" className="animate-pulse">
                                {previewRows.filter(r => r._status === 'error').length} Errori
                            </Badge>
                        )}
                    </div>
                </div>
                {(phoneStats.valid > 0 || phoneStats.invalid > 0) && (
                    <div className="flex items-center gap-4 border-t pt-2 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Phone className="h-3 w-3" /> Telefono:
                        </span>
                        <span className="text-green-600">{phoneStats.valid} Validi</span>
                        <span className="text-gray-300">|</span>
                        <span className={phoneStats.invalid > 0 ? "text-red-600 font-bold" : "text-gray-400"}>
                            {phoneStats.invalid} Invalidi
                        </span>
                    </div>
                )}
             </div>

             {/* Live Preview Table */}
             <div className="border rounded-md flex-1 overflow-hidden flex flex-col bg-white">
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[50px] text-xs h-8">Status</TableHead>
                                {Object.keys(mapping).map(header => (
                                    <TableHead key={header} className="whitespace-nowrap text-xs h-8 px-2">
                                        {availableFields.find(f => f.key === mapping[header])?.label || header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewRows.map((row, idx) => (
                                <TableRow key={idx} className={row._status === 'error' ? 'bg-red-50 hover:bg-red-100' : (row._status === 'warning' ? 'bg-yellow-50 hover:bg-yellow-100' : '')}>
                                    <TableCell className="py-2 px-2">
                                        {row._status === 'valid' && <Check className="h-4 w-4 text-green-500" />}
                                        {row._status === 'warning' && <Info className="h-4 w-4 text-yellow-500" />}
                                        {row._status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                    </TableCell>
                                    {Object.keys(mapping).map(header => {
                                        const dbKey = mapping[header];
                                        const val = row._parsed[dbKey];
                                        const original = row._original[header];
                                        const fieldDef = availableFields.find(f => f.key === dbKey);
                                        const isErr = row._errors.some(e => e.includes(fieldDef?.label));

                                        return (
                                            <TableCell key={header} className={`text-xs py-2 px-2 whitespace-nowrap max-w-[150px] truncate ${isErr ? 'text-red-600 font-bold' : ''}`}>
                                                {val === null || val === undefined ? <span className="text-gray-300">-</span> : String(val)}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMappingForm;
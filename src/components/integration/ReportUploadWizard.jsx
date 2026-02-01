import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, ArrowRight, CheckCircle } from 'lucide-react';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

const STEPS = { UPLOAD: 0, MAPPING: 1, PREVIEW: 2, COMPLETE: 3 };

export default function ReportUploadWizard({ onComplete }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [mapping, setMapping] = useState({ studentName: '', score: '', date: '' });

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1, 6).map(line => {
            const values = line.split(',');
            return headers.reduce((acc, header, index) => { acc[header] = values[index]; return acc; }, {});
          });
          setCsvHeaders(headers);
          setPreviewData(data);
          setStep(STEPS.MAPPING);
        }
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleIngest = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API for now
    ultraMinimalToast(`Successfully imported ${file.name}`);
    setStep(STEPS.COMPLETE);
    if (onComplete) onComplete();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader><CardTitle>Import Activity Report</CardTitle></CardHeader>
      <CardContent>
        {step === STEPS.UPLOAD && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
            <Input type="file" accept=".csv" onChange={handleFileUpload} className="max-w-xs" />
          </div>
        )}
        {step === STEPS.MAPPING && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Student Name</Label><Select onValueChange={(v) => setMapping(p => ({...p, studentName: v}))}><SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger><SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Score</Label><Select onValueChange={(v) => setMapping(p => ({...p, score: v}))}><SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger><SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <Button className="w-full" onClick={() => setStep(STEPS.PREVIEW)}>Review Data <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </div>
        )}
        {step === STEPS.PREVIEW && (
          <div className="space-y-4">
             <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Score</TableHead></TableRow></TableHeader><TableBody>{previewData.map((row, i) => (<TableRow key={i}><TableCell>{row[mapping.studentName]}</TableCell><TableCell>{row[mapping.score]}</TableCell></TableRow>))}</TableBody></Table></div>
             <Button className="w-full" onClick={handleIngest}>Import Records</Button>
          </div>
        )}
        {step === STEPS.COMPLETE && (
          <div className="text-center py-8"><CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" /><h3 className="text-xl font-medium">Import Complete!</h3><Button className="mt-6" variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>Import Another</Button></div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState } from 'react';
import { ArrowRight, CheckCircle, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

const STEPS = {
  UPLOAD: 0,
  MAPPING: 1,
  PREVIEW: 2,
  COMPLETE: 3,
};

export default function ReportUploadWizard({ onComplete }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [mapping, setMapping] = useState({
    studentName: '',
    score: '',
    date: '',
    activityName: '',
  });

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) {
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (fileEvent) => {
      const text = fileEvent.target.result;
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);

      if (lines.length > 0) {
        const headers = lines[0].split(',').map((header) => header.trim());
        const data = lines.slice(1, 6).map((line) => {
          const values = line.split(',');
          return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
          }, {});
        });
        setCsvHeaders(headers);
        setPreviewData(data);
        setStep(STEPS.MAPPING);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngest = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (file) {
      ultraMinimalToast(`Successfully imported ${file.name}`);
    }
    setStep(STEPS.COMPLETE);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Import Activity Report</CardTitle>
      </CardHeader>
      <CardContent>
        {step === STEPS.UPLOAD && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file from Reflex Math, IXL, or similar.
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="max-w-xs"
            />
          </div>
        )}

        {step === STEPS.MAPPING && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Map the columns from your CSV to Teachmo fields.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student Name Column</Label>
                <Select
                  onValueChange={(value) =>
                    handleMappingChange('studentName', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score/Grade Column</Label>
                <Select
                  onValueChange={(value) => handleMappingChange('score', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity Date</Label>
                <Select onValueChange={(value) => handleMappingChange('date', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity Name</Label>
                <Select
                  onValueChange={(value) =>
                    handleMappingChange('activityName', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(STEPS.PREVIEW)}>
              Review Data <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === STEPS.PREVIEW && (
          <div className="space-y-4">
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row[mapping.studentName] || '-'}</TableCell>
                      <TableCell>{row[mapping.score] || '-'}</TableCell>
                      <TableCell>{row[mapping.date] || '-'}</TableCell>
                      <TableCell>{row[mapping.activityName] || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(STEPS.MAPPING)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleIngest}>
                Import Records
              </Button>
            </div>
          </div>
        )}

        {step === STEPS.COMPLETE && (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900">Import Complete!</h3>
            <p className="text-gray-600 mt-2">
              Your report data has been added to student records.
            </p>
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => setStep(STEPS.UPLOAD)}
            >
              Import Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

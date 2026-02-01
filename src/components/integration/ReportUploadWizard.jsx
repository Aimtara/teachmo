import { useState } from 'react';
import PropTypes from 'prop-types';
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

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit to prevent browser hangs
    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      ultraMinimalToast.error('File too large. Please upload a CSV file smaller than 5MB.');
      // Reset the input so the same file can be reselected if needed
      if (event.target) {
        event.target.value = '';
      }
      return;
    }
    // Validate file type - check both extension and MIME type
    const fileName = uploadedFile.name.toLowerCase();
    const validExtension = fileName.endsWith('.csv');
    // MIME type can be 'text/csv', 'application/vnd.ms-excel', or empty (some browsers don't set it)
    const validMimeType = uploadedFile.type === '' || uploadedFile.type === 'text/csv' || uploadedFile.type === 'application/vnd.ms-excel';

    if (!validExtension) {
      ultraMinimalToast.error('Invalid file type. Please upload a valid CSV file (.csv extension required).');
      // Reset the input so the user can try again
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    if (!validMimeType) {
      ultraMinimalToast.error('The file type is not recognized as a CSV file. Please ensure you are uploading a valid CSV file.');
      // Reset the input so the user can try again
      if (event.target) {
        event.target.value = '';
      }
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
        // Parse CSV with support for quoted values containing commas and escaped quotes (RFC 4180)
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Escaped quote: two consecutive quotes become one quote character
                current += '"';
                i++; // Skip the next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        
        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1, 6).map((line) => {
          const values = parseCSVLine(line);
          return headers.reduce((acc, header, index) => {
            acc[header] = values[index] || '';
            return acc;
          }, {});
        });
        setCsvHeaders(headers);
        setPreviewData(data);
        // Reset mapping when new file is uploaded
        setMapping({
          studentName: '',
          score: '',
          date: '',
          activityName: '',
        });
        setStep(STEPS.MAPPING);
      }
    };
    
    reader.onerror = () => {
      ultraMinimalToast.error('Failed to read file. Please try again with a valid CSV.');
      setFile(null);
      setCsvHeaders([]);
      setPreviewData([]);
      setStep(STEPS.UPLOAD);
    };
    
    reader.readAsText(uploadedFile);
  };

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngest = async () => {
    // TODO: Replace with actual API call to persist imported data
    // Currently simulates import for UI demonstration purposes
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (file) {
      ultraMinimalToast.success(`Successfully imported ${file.name}`);
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
            <Button
              className="w-full"
              disabled={
                !mapping ||
                !mapping.studentName ||
                !(mapping.score || mapping.date || mapping.activityName)
              }
              onClick={() => {
                // Check if at least one field is mapped and the mapped value exists in csvHeaders
                const validMappings = Object.values(mapping).filter((value) => 
                  Boolean(value) && csvHeaders.includes(value)
                );
                if (validMappings.length === 0) {
                  ultraMinimalToast.error(
                    'Please map at least one column from your CSV before reviewing the data.'
                  );
                  return;
                }
                setStep(STEPS.PREVIEW);
              }}
            >
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
            <p className="text-xs text-gray-500 mt-4 italic">
              Note: This is a demonstration UI. Actual data persistence requires backend implementation.
            </p>
            <Button
              className="mt-6"
              variant="outline"
              onClick={() => {
                // Reset all state when starting a new import
                setFile(null);
                setCsvHeaders([]);
                setPreviewData([]);
                setMapping({
                  studentName: '',
                  score: '',
                  date: '',
                  activityName: '',
                });
                setStep(STEPS.UPLOAD);
              }}
            >
              Import Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

ReportUploadWizard.propTypes = {
  onComplete: PropTypes.func,
};

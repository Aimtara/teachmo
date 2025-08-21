import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Loader2, FileCheck2, AlertCircle } from 'lucide-react';
import { User, ImportLog } from '@/api/entities';

// Simple CSV parser function
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length && values.some(v => v)) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return { headers, data };
}

export default function BulkUserImport({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    User.me().then(setCurrentUser).catch(() => null);
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid File', 
        description: 'Please select a CSV file.' 
      });
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({ 
        variant: 'destructive', 
        title: 'No file selected', 
        description: 'Please select a CSV file to import.' 
      });
      return;
    }
    
    if (!currentUser) {
      toast({ 
        variant: 'destructive', 
        title: 'Authentication Error', 
        description: 'Could not identify the current user.' 
      });
      return;
    }

    setIsImporting(true);
    let logId;
    
    try {
      // Create import log entry
      const newLog = await ImportLog.create({
        importer_id: currentUser.id,
        status: 'processing',
        total_rows: 0,
      });
      logId = newLog.id;

      // Read and parse CSV file
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const { headers, data: usersToCreate } = parseCSV(fileContent);
      
      // Validate required headers
      const requiredHeaders = ['email', 'full_name', 'role'];
      const missingHeaders = requiredHeaders.filter(header => 
        !headers.some(h => h.toLowerCase() === header.toLowerCase())
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      await ImportLog.update(logId, { total_rows: usersToCreate.length });

      let successfulCount = 0;
      let failedCount = 0;
      const errors = [];

      // Process each user
      for (const user of usersToCreate) {
        try {
          // Normalize field names (case insensitive)
          const normalizedUser = {};
          Object.keys(user).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'email') normalizedUser.email = user[key];
            else if (lowerKey === 'full_name') normalizedUser.full_name = user[key];
            else if (lowerKey === 'role') normalizedUser.role = user[key];
            else if (lowerKey === 'user_type') normalizedUser.user_type = user[key];
          });

          if (!normalizedUser.email || !normalizedUser.full_name || !normalizedUser.role) {
            throw new Error(`Missing required fields for user with email ${normalizedUser.email || '(missing)'}`);
          }

          await User.create({
            email: normalizedUser.email,
            full_name: normalizedUser.full_name,
            role: normalizedUser.role,
            user_type: normalizedUser.user_type || 'parent',
            status: 'invited'
          });
          successfulCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Failed to import ${user.email || 'unknown'}: ${error.message}`);
        }
      }

      // Update final log status
      await ImportLog.update(logId, {
        status: failedCount > 0 ? 'failed' : 'completed',
        successful_rows: successfulCount,
        failed_rows: failedCount,
        error_details: errors
      });

      toast({
        title: 'Import Complete',
        description: `${successfulCount} users imported successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      if (logId) {
        await ImportLog.update(logId, { 
          status: 'failed', 
          error_details: [error.message] 
        });
      }
      toast({ 
        variant: 'destructive', 
        title: 'Import Failed', 
        description: error.message 
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Users</CardTitle>
        <CardDescription>
          Upload a CSV file to invite multiple users at once. Required columns: email, full_name, role. Optional: user_type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="max-w-sm" 
          />
          <Button onClick={handleImport} disabled={isImporting || !file}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Users
              </>
            )}
          </Button>
        </div>
        
        {file && (
          <div className="flex items-center text-sm text-gray-600 bg-green-50 p-3 rounded-md">
            <FileCheck2 className="mr-2 h-4 w-4 text-green-500" />
            <span>Selected file: {file.name}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">CSV Format Requirements:</p>
              <ul className="mt-1 space-y-1 text-blue-700">
                <li>• Required columns: email, full_name, role</li>
                <li>• Optional columns: user_type (defaults to 'parent')</li>
                <li>• Valid roles: parent, teacher, school_admin, district_admin, system_admin</li>
                <li>• Example: email,full_name,role,user_type</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
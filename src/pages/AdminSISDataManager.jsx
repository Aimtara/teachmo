import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminSISDataManager');

const SIS_TABLES = [
  { name: 'sis_roster_students', columns: ['id', 'student_id', 'student_name', 'grade', 'status'] },
  { name: 'sis_roster_teachers', columns: ['id', 'teacher_id', 'teacher_name', 'status'] },
  { name: 'sis_roster_classes', columns: ['id', 'class_id', 'class_name', 'term', 'status'] },
  { name: 'sis_roster_enrollments', columns: ['id', 'enrollment_id', 'student_id', 'class_id', 'status'] },
];

export default function AdminSISDataManager() {
  const toast = useToast();
  const [table, setTable] = useState('sis_roster_students');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchRecords = async (tableName) => {
    try {
      const cols = SIS_TABLES.find((t) => t.name === tableName).columns.join(', ');
      const query = `query GetRecords { ${tableName}(limit: 20) { ${cols} } }`;
      const res = await graphqlRequest(query);
      setRecords(res[tableName]);
    } catch (err) {
      logger.error('Failed to fetch records', err);
      toast({ title: 'Failed to load records', status: 'error' });
    }
  };

  useEffect(() => {
    fetchRecords(table);
  }, [table]);

  const handleOpenRecord = (record) => {
    setSelectedRecord(record);
    onOpen();
  };

  const handleSave = async () => {
    try {
      const columns = SIS_TABLES.find((t) => t.name === table).columns;
      const updates = {};
      columns.forEach((col) => {
        if (col !== 'id') updates[col] = selectedRecord[col];
      });
      const mutation = `mutation UpdateRecord($id: uuid!, $data: ${table}_set_input!) {
        update_${table}_by_pk(pk_columns: {id: $id}, _set: $data) { id }
      }`;
      await graphqlRequest(mutation, { id: selectedRecord.id, data: updates });
      toast({ title: 'Record updated', status: 'success' });
      onClose();
      await fetchRecords(table);
    } catch (err) {
      logger.error('Failed to update record', err);
      toast({ title: 'Update failed', status: 'error' });
    }
  };

  const handleChangeField = (field, value) => {
    setSelectedRecord((prev) => ({ ...prev, [field]: value }));
  };

  const currentColumns = SIS_TABLES.find((t) => t.name === table).columns;

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <Heading mb={4}>SIS Data Manager</Heading>
      <Card mb={6}>
        <CardHeader><Heading size="md">Select Table</Heading></CardHeader>
        <CardBody>
          <FormControl maxW="sm">
            <FormLabel>Table</FormLabel>
            <Select value={table} onChange={(e) => setTable(e.target.value)}>
              {SIS_TABLES.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </Select>
          </FormControl>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><Heading size="md">Records</Heading></CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                {currentColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((rec) => (
                <Tr key={rec.id}>
                  {currentColumns.map((col) => (
                    <Td key={`${rec.id}-${col}`}>{rec[col]}</Td>
                  ))}
                  <Td>
                    <Button size="xs" colorScheme="blue" onClick={() => handleOpenRecord(rec)}>Edit</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Record</ModalHeader>
          <ModalBody>
            {selectedRecord && currentColumns.filter((c) => c !== 'id').map((field) => (
              <FormControl key={field} mb={3}>
                <FormLabel>{field}</FormLabel>
                <Input value={selectedRecord[field] || ''} onChange={(e) => handleChangeField(field, e.target.value)} />
              </FormControl>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSave}>Save</Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

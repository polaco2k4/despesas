import React, { useState, useEffect } from 'react';
import { mockUsuarios, mockDepartamentos } from '../data/mockData';
import type { Usuario, UserRole } from '../types/database';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, MenuItem, IconButton, Box, Typography, Snackbar, Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

type FormData = Omit<Usuario, 'id' | 'created_at' | 'updated_at' | 'departamento'> & {
  id?: string;
  password?: string;
  confirmPassword?: string;
};

const initialFormData: FormData = {
  nome: '',
  email: '',
  role: 'colaborador',
  departamento_id: '',
  password: '',
  confirmPassword: ''
};

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [departamentos, setDepartamentos] = useState(mockDepartamentos);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    // In a real app, this would be an API call
    setUsuarios(mockUsuarios.map(usuario => ({
      ...usuario,
      departamento: departamentos.find(d => d.id === usuario.departamento_id)
    })));
  }, []);

  const handleOpen = (usuario: Usuario | null = null) => {
    if (usuario) {
      setEditingId(usuario.id);
      setFormData({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        departamento_id: usuario.departamento_id || '',
        password: '',
        confirmPassword: ''
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.nome || !formData.email || !formData.role || !formData.departamento_id) {
      setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' });
      return false;
    }

    if (!editingId && (!formData.password || formData.password.length < 6)) {
      setSnackbar({ open: true, message: 'A senha deve ter pelo menos 6 caracteres', severity: 'error' });
      return false;
    }

    if (!editingId && formData.password !== formData.confirmPassword) {
      setSnackbar({ open: true, message: 'As senhas não coincidem', severity: 'error' });
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (editingId) {
      // Update existing user
      const updatedUsuarios = usuarios.map(usuario => 
        usuario.id === editingId 
          ? { 
              ...usuario, 
              ...formData,
              departamento: departamentos.find(d => d.id === formData.departamento_id)
            } 
          : usuario
      );
      setUsuarios(updatedUsuarios);
      setSnackbar({ open: true, message: 'Usuário atualizado com sucesso!', severity: 'success' });
    } else {
      // Add new user
      const newUser: Usuario = {
        id: `user-${Date.now()}`,
        nome: formData.nome,
        email: formData.email,
        role: formData.role as UserRole,
        departamento_id: formData.departamento_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        departamento: departamentos.find(d => d.id === formData.departamento_id)
      };
      setUsuarios([...usuarios, newUser]);
      setSnackbar({ open: true, message: 'Usuário adicionado com sucesso!', severity: 'success' });
    }
    
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsuarios(usuarios.filter(usuario => usuario.id !== id));
      setSnackbar({ open: true, message: 'Usuário excluído com sucesso!', severity: 'success' });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gerenciar Usuários</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Adicionar Usuário
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.nome}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>{usuario.departamento?.nome || 'N/A'}</TableCell>
                <TableCell>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 
                      usuario.role === 'admin' ? '#e3f2fd' : 
                      usuario.role === 'gestor' ? '#e8f5e9' : '#f3e5f5',
                    color: 
                      usuario.role === 'admin' ? '#0d47a1' : 
                      usuario.role === 'gestor' ? '#2e7d32' : '#6a1b9a',
                    fontWeight: 500
                  }}>
                    {usuario.role === 'admin' ? 'Administrador' : 
                     usuario.role === 'gestor' ? 'Gestor' : 'Colaborador'}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(usuario)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDelete(usuario.id)} 
                    color="error"
                    disabled={usuario.role === 'admin'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingId ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nome Completo"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
              />
              
              {!editingId && (
                <>
                  <TextField
                    label="Senha"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    fullWidth
                    required={!editingId}
                    margin="normal"
                  />
                  <TextField
                    label="Confirmar Senha"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    required={!editingId}
                    margin="normal"
                  />
                </>
              )}
              
              <TextField
                select
                label="Perfil"
                name="role"
                value={formData.role}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
              >
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="gestor">Gestor</MenuItem>
                <MenuItem value="colaborador">Colaborador</MenuItem>
              </TextField>
              
              <TextField
                select
                label="Departamento"
                name="departamento_id"
                value={formData.departamento_id}
                onChange={handleChange}
                fullWidth
                required
                margin="normal"
              >
                {departamentos.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity as 'success' | 'error'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Usuarios;

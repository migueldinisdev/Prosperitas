import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Plus, 
  Trash2, 
  Edit2,
  ShoppingBag,
  Home,
  Car,
  Coffee,
  Heart,
  Zap,
  DollarSign,
  Briefcase,
  Plane,
  Film,
  Music,
  Utensils,
  ShoppingCart,
  Laptop,
  Smartphone
} from 'lucide-react';
import type { Category } from '../core/types';

type EditableCategory = Category & { icon: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Mock initial categories
const initialCategories: EditableCategory[] = [
  { id: '1', name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', type: 'expense' },
  { id: '2', name: 'Rent', icon: 'Home', color: '#d61544', type: 'expense' },
  { id: '3', name: 'Transportation', icon: 'Car', color: '#f59e0b', type: 'expense' },
  { id: '4', name: 'Entertainment', icon: 'Film', color: '#8b5cf6', type: 'expense' },
  { id: '5', name: 'Dining', icon: 'Utensils', color: '#ef4444', type: 'expense' },
  { id: '6', name: 'Utilities', icon: 'Zap', color: '#06b6d4', type: 'expense' },
];

// Available icons mapping
const iconComponents: Record<string, React.ElementType> = {
  ShoppingBag,
  Home,
  Car,
  Coffee,
  Heart,
  Zap,
  DollarSign,
  Briefcase,
  Plane,
  Film,
  Music,
  Utensils,
  ShoppingCart,
  Laptop,
  Smartphone,
};

const availableColors = [
  '#ef4444', // red
  '#f59e0b', // orange
  '#eab308', // yellow
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#d61544', // primary
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export const ManageCategoriesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState<EditableCategory[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('ShoppingBag');
  const [formColor, setFormColor] = useState('#10b981');

  const resetForm = () => {
    setFormName('');
    setFormIcon('ShoppingBag');
    setFormColor('#10b981');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formName.trim()) return;
    
    const newCategory: EditableCategory = {
      id: Date.now().toString(),
      name: formName,
      icon: formIcon,
      color: formColor,
      type: 'expense',
    };
    
    setCategories([...categories, newCategory]);
    resetForm();
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormName(category.name);
    setFormIcon(category.icon);
    setFormColor(category.color);
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!formName.trim() || !editingId) return;
    
    setCategories(categories.map(cat => 
      cat.id === editingId 
        ? { ...cat, name: formName, icon: formIcon, color: formColor }
        : cat
    ));
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(cat => cat.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const startAdding = () => {
    resetForm();
    setIsAdding(true);
  };

  const IconComponent = iconComponents[formIcon];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      <div className="space-y-4">
        {/* Categories List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((category) => {
            const CategoryIcon = iconComponents[category.icon] || ShoppingBag;
            return (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-app-surface rounded-lg border border-app-border hover:border-app-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <CategoryIcon size={16} style={{ color: category.color }} />
                  </div>
                  <span className="text-sm font-medium text-app-foreground">{category.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-app-muted hover:text-app-foreground hover:bg-app-card rounded-md transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-1.5 text-app-muted hover:text-app-danger hover:bg-app-danger/10 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="border-t border-app-border pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-app-foreground">
              {editingId ? 'Edit Category' : 'Add Category'}
            </h4>
            
            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Name</label>
              <input 
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Category name"
                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground text-sm focus:outline-none focus:ring-1 focus:ring-app-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(iconComponents).map((iconName) => {
                  const Icon = iconComponents[iconName];
                  return (
                    <button
                      key={iconName}
                      onClick={() => setFormIcon(iconName)}
                      className={`p-2 rounded-lg border transition-all ${
                        formIcon === iconName
                          ? 'border-app-primary bg-app-primary/10'
                          : 'border-app-border hover:border-app-primary/40 bg-app-surface'
                      }`}
                    >
                      <Icon size={20} className={formIcon === iconName ? 'text-app-foreground' : 'text-app-muted'} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Color</label>
              <div className="flex gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formColor === color ? 'ring-2 ring-app-primary ring-offset-2 ring-offset-app-card' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {IconComponent && (
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${formColor}20` }}
                  >
                    <IconComponent size={20} style={{ color: formColor }} />
                  </div>
                )}
                <span className="text-sm text-app-foreground">{formName || 'Preview'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={editingId ? handleUpdate : handleAdd}
                  disabled={!formName.trim()}
                >
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Button */}
        {!isAdding && !editingId && (
          <Button 
            variant="secondary" 
            className="w-full" 
            icon={<Plus size={16} />}
            onClick={startAdding}
          >
            Add Category
          </Button>
        )}
      </div>
    </Modal>
  );
};

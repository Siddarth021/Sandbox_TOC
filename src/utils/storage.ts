import { MachineType, MachineDefinition } from '@/types/computation';

export interface SavedModel {
  id: string;
  name: string;
  type: MachineType | string;
  definition: MachineDefinition;
  updatedAt: number;
}

const STORAGE_KEY = 'ucs_saved_models';

export const StorageService = {
  getModels(): SavedModel[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  saveModel(model: Omit<SavedModel, 'updatedAt'>): SavedModel {
    const models = this.getModels();
    const existingIndex = models.findIndex(m => m.id === model.id);
    
    const updatedModel: SavedModel = {
      ...model,
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      models[existingIndex] = updatedModel;
    } else {
      models.push(updatedModel);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    return updatedModel;
  },

  getModelById(id: string): SavedModel | undefined {
    return this.getModels().find(m => m.id === id);
  },

  deleteModel(id: string) {
    const models = this.getModels().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  }
};

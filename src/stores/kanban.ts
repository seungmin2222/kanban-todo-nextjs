import { Board, Task } from '@/types/kanban';
import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KanbanStore {
  board: Board;

  addColumn: (title: string) => void;
  updateColumn: (columnId: string, title: string) => void;
  deleteColumn: (columnId: string) => void;

  addTask: (
    columnId: string,
    task: Omit<Task, 'id' | 'columnId' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateTask: (taskId: string, task: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  moveTask: (
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    newIndex: number
  ) => void;
  reorderColumn: (startIndex: number, endIndex: number) => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set) => ({
      board: {
        columns: {},
        tasks: {},
        columnOrder: [],
      },

      addColumn: (title) =>
        set((state) => {
          const newColumnId = uuid();
          return {
            board: {
              ...state.board,
              columns: {
                ...state.board.columns,
                [newColumnId]: {
                  id: newColumnId,
                  title,
                  taskIds: [],
                },
              },
              columnOrder: [...state.board.columnOrder, newColumnId],
            },
          };
        }),

      updateColumn: (columnId, title) =>
        set((state) => ({
          board: {
            ...state.board,
            columns: {
              ...state.board.columns,
              [columnId]: {
                ...state.board.columns[columnId],
                title,
              },
            },
          },
        })),

      deleteColumn: (columnId) =>
        set((state) => {
          const { [columnId]: deletedColumn, ...remainingColumns } =
            state.board.columns;

          const remainingTasks = { ...state.board.tasks };
          deletedColumn.taskIds.forEach((taskId) => {
            delete remainingTasks[taskId];
          });

          return {
            board: {
              columns: remainingColumns,
              tasks: remainingTasks,
              columnOrder: state.board.columnOrder.filter(
                (id) => id !== columnId
              ),
            },
          };
        }),

      addTask: (columnId, taskData) =>
        set((state) => {
          const newTaskId = uuid();
          const newTask: Task = {
            id: newTaskId,
            ...taskData,
            columnId,
            createdAt: new Date(),
          };

          return {
            board: {
              ...state.board,
              tasks: {
                ...state.board.tasks,
                [newTaskId]: newTask,
              },
              columns: {
                ...state.board.columns,
                [columnId]: {
                  ...state.board.columns[columnId],
                  taskIds: [
                    ...state.board.columns[columnId].taskIds,
                    newTaskId,
                  ],
                },
              },
            },
          };
        }),

      updateTask: (taskId, updatedData) =>
        set((state) => ({
          board: {
            ...state.board,
            tasks: {
              ...state.board.tasks,
              [taskId]: {
                ...state.board.tasks[taskId],
                ...updatedData,
                updatedAt: new Date(),
              },
            },
          },
        })),

      deleteTask: (taskId) =>
        set((state) => {
          const task = state.board.tasks[taskId];
          const newTasks = { ...state.board.tasks };
          delete newTasks[taskId];

          return {
            board: {
              ...state.board,
              tasks: newTasks,
              columns: {
                ...state.board.columns,
                [task.columnId]: {
                  ...state.board.columns[task.columnId],
                  taskIds: state.board.columns[task.columnId].taskIds.filter(
                    (id) => id !== taskId
                  ),
                },
              },
            },
          };
        }),

      moveTask: (taskId, sourceColumnId, destinationColumnId, newIndex) =>
        set((state) => {
          const sourceColumn = state.board.columns[sourceColumnId];
          const destColumn = state.board.columns[destinationColumnId];

          const newSourceTaskIds = sourceColumn.taskIds.filter(
            (id) => id !== taskId
          );

          const newDestTaskIds = [...destColumn.taskIds];

          const existingIndex = newDestTaskIds.indexOf(taskId);
          if (existingIndex !== -1) {
            newDestTaskIds.splice(existingIndex, 1);
          }

          newDestTaskIds.splice(newIndex, 0, taskId);

          return {
            board: {
              ...state.board,
              columns: {
                ...state.board.columns,
                [sourceColumnId]: {
                  ...sourceColumn,
                  taskIds: newSourceTaskIds,
                },
                [destinationColumnId]: {
                  ...destColumn,
                  taskIds: newDestTaskIds,
                },
              },
              tasks: {
                ...state.board.tasks,
                [taskId]: {
                  ...state.board.tasks[taskId],
                  columnId: destinationColumnId,
                },
              },
            },
          };
        }),

      reorderColumn: (startIndex, endIndex) =>
        set((state) => {
          const newColumnOrder = [...state.board.columnOrder];
          const [removed] = newColumnOrder.splice(startIndex, 1);
          newColumnOrder.splice(endIndex, 0, removed);

          return {
            board: {
              ...state.board,
              columnOrder: newColumnOrder,
            },
          };
        }),
    }),
    {
      name: 'kanban-storage',
    }
  )
);

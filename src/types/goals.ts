export interface Task {
    id: number;
    text: string;
    done: boolean;
    note: string;
    subtasks: Task[];
}

export interface Goal {
    id: number;
    title: string;
    description?: string;
    tasks: Task[];
    order?: number;
}

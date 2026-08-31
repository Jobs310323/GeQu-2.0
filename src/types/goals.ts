export interface Task {
    id: number;
    text: string;
    done: boolean;
    note: string;
    subtasks: Task[];
    tags: string[];
}

export interface Goal {
    id: number;
    title: string;
    description?: string | undefined;
    tasks: Task[];
    order?: number | undefined;
    tags: string[];
}

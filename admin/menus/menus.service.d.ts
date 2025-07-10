import { Model } from 'mongoose';
export declare class MenusService {
    private menusRepo;
    private componentRepo;
    private activityRepo;
    constructor(menusRepo: Model<any>, componentRepo: Model<any>, activityRepo: Model<any>);
    addDefaultMenus(): Promise<void>;
    get(): Promise<any[]>;
    addMenu(menuDTO: any): Promise<any>;
    deleteMenu(menuName: any): Promise<{
        ok?: number;
        n?: number;
    } & {
        deletedCount?: number;
    }>;
    updateMenu(name: any, route: any): Promise<any>;
    addComponent(menu: any, componentDTO: any): Promise<any>;
    deleteComponent(componentName: any): Promise<{
        ok?: number;
        n?: number;
    } & {
        deletedCount?: number;
    }>;
    updateComponent(name: any, componentDTO: any): Promise<any>;
    addComponentActivity(menu: any, component: any, activityDTO: any): Promise<any>;
    deleteActivity(activityName: any): Promise<{
        ok?: number;
        n?: number;
    } & {
        deletedCount?: number;
    }>;
}

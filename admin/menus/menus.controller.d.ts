import { MenusService } from './menus.service';
export declare class MenusController {
    private menusService;
    constructor(menusService: MenusService);
    get(query: any): Promise<any>;
    addMenu(menu: any): Promise<any>;
    updateMenu(routesName: string, route: any): Promise<any>;
    deleteMenu(menuName: string): Promise<any>;
    addComponent(routeName: string, component: any): Promise<any>;
    updateComponent(routeName: string, componentName: string, component: any): Promise<any>;
    deleteComponent(componentName: string): Promise<any>;
    addComponentActivity(route: string, component: string, activity: any): Promise<any>;
    deleteActivity(activityName: string): Promise<any>;
}

import { RolesService } from './roles.service';
export declare class RolesController {
    private rolesService;
    constructor(rolesService: RolesService);
    get(): Promise<any>;
    add(roleDTO: any): Promise<any>;
    put(roleDTO: any): Promise<any>;
    delete(roleName: string): Promise<any>;
}

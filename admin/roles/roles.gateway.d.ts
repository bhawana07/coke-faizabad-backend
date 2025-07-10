import { RolesService } from './roles.service';
import { WsResponse } from '@nestjs/websockets';
export declare class RolesGateway {
    private rolesService;
    server: any;
    roles: any;
    constructor(rolesService: RolesService);
    handleEvent(data: unknown): WsResponse<unknown>;
    handleConnection(client: any): Promise<void>;
}

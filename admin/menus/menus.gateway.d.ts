import { MenusService } from './menus.service';
import { WsResponse } from '@nestjs/websockets';
export declare class MenusGateway {
    private menusService;
    server: any;
    menus: any;
    constructor(menusService: MenusService);
    handleEvent(data: unknown): WsResponse<unknown>;
    handleConnection(client: any): Promise<void>;
}

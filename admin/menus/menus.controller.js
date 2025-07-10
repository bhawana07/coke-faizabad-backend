"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenusController = void 0;
const common_1 = require("@nestjs/common");
const menus_service_1 = require("./menus.service");
let MenusController = class MenusController {
    constructor(menusService) {
        this.menusService = menusService;
    }
    async get(query) {
        return await this.menusService.get();
    }
    async addMenu(menu) {
        return await this.menusService.addMenu(menu);
    }
    async updateMenu(routesName, route) {
        return await this.menusService.updateMenu(routesName, route);
    }
    async deleteMenu(menuName) {
        return await this.menusService.deleteMenu(menuName);
    }
    async addComponent(routeName, component) {
        return await this.menusService.addComponent(routeName, component);
    }
    async updateComponent(routeName, componentName, component) {
        return await this.menusService.updateComponent(routeName, component);
    }
    async deleteComponent(componentName) {
        return await this.menusService.deleteComponent(componentName);
    }
    async addComponentActivity(route, component, activity) {
        return this.menusService.addComponentActivity(route, component, activity);
    }
    async deleteActivity(activityName) {
        return await this.menusService.deleteActivity(activityName);
    }
};
__decorate([
    common_1.Get(),
    __param(0, common_1.Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "get", null);
__decorate([
    common_1.Post(),
    __param(0, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "addMenu", null);
__decorate([
    common_1.Post(':route'),
    __param(0, common_1.Param('route')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "updateMenu", null);
__decorate([
    common_1.Delete(':route'),
    __param(0, common_1.Param('route')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "deleteMenu", null);
__decorate([
    common_1.Post(':route/components'),
    __param(0, common_1.Param('route')), __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "addComponent", null);
__decorate([
    common_1.Post(':routes/components/:component'),
    __param(0, common_1.Param('route')), __param(1, common_1.Param('component')), __param(2, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "updateComponent", null);
__decorate([
    common_1.Delete(':routes/components/:component'),
    __param(0, common_1.Param('component')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "deleteComponent", null);
__decorate([
    common_1.Post(':route/components/:component/activities'),
    __param(0, common_1.Param('menu')), __param(1, common_1.Param('component')), __param(2, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "addComponentActivity", null);
__decorate([
    common_1.Delete(':route/components/:component/activities/:activity'),
    __param(0, common_1.Param('activity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenusController.prototype, "deleteActivity", null);
MenusController = __decorate([
    common_1.Controller('menus'),
    __metadata("design:paramtypes", [menus_service_1.MenusService])
], MenusController);
exports.MenusController = MenusController;
//# sourceMappingURL=menus.controller.js.map
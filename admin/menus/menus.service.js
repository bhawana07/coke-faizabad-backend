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
exports.MenusService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const path = require("path");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), 'utf-8'));
const ua = JSON.parse(fs.readFileSync(path.resolve('./ua.json'), 'utf-8'));
let MenusService = class MenusService {
    constructor(menusRepo, componentRepo, activityRepo) {
        this.menusRepo = menusRepo;
        this.componentRepo = componentRepo;
        this.activityRepo = activityRepo;
    }
    async addDefaultMenus() {
        ua.defaultMenus.forEach(async (defaultMenu) => {
            const menus = await this.menusRepo.find();
            if (menus.length === 0) {
                await this.addMenu(defaultMenu);
            }
        });
    }
    async get() {
        return await this.menusRepo.find().populate({ path: 'route.components', populate: { path: 'activities', Model: 'Activity' } });
    }
    async addMenu(menuDTO) {
        return await new this.menusRepo(menuDTO).save();
    }
    async deleteMenu(menuName) {
        return await this.menusRepo.deleteOne({ name: menuName });
    }
    async updateMenu(name, route) {
        return await this.menusRepo.update({ name }, { $set: route });
    }
    async addComponent(menu, componentDTO) {
        const component = await new this.componentRepo(componentDTO).save();
        const updateValue = { 'route.components': component._id };
        const findMenu = await this.menusRepo.findOneAndUpdate({ name: menu }, { $push: updateValue });
        return findMenu;
    }
    async deleteComponent(componentName) {
        return await this.componentRepo.deleteOne({ name: componentName });
    }
    async updateComponent(name, componentDTO) {
        return await this.menusRepo.update({ name }, { $set: componentDTO });
    }
    async addComponentActivity(menu, component, activityDTO) {
        const activity = await new this.activityRepo(activityDTO).save();
        const updateValue = { 'activities': activity._id };
        const findActivity = await this.componentRepo.findOneAndUpdate({ name: component }, { $push: updateValue });
        return findActivity;
    }
    async deleteActivity(activityName) {
        return await this.activityRepo.deleteOne({ name: activityName });
    }
};
MenusService = __decorate([
    common_1.Injectable(),
    __param(0, mongoose_2.InjectModel('Menu-Route')),
    __param(1, mongoose_2.InjectModel('MenuRoute-Component')),
    __param(2, mongoose_2.InjectModel('Component-Activity')),
    __metadata("design:paramtypes", [mongoose_1.Model,
        mongoose_1.Model,
        mongoose_1.Model])
], MenusService);
exports.MenusService = MenusService;
//# sourceMappingURL=menus.service.js.map
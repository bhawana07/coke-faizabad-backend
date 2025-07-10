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
exports.UsersService = void 0;
const mongoose_1 = require("mongoose");
const bcrypt = require("bcryptjs");
const common_1 = require("@nestjs/common");
const mongoose_2 = require("@nestjs/mongoose");
const auth_service_1 = require("../../auth/auth.service");
const menus_service_1 = require("../menus/menus.service");
const path = require("path");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(path.resolve('./config.json'), 'utf-8'));
const ua = JSON.parse(fs.readFileSync(path.resolve('./ua.json'), 'utf-8'));
const superAdmins = ua.defaultSuperAdmins.map(sa => sa.email);
let UsersService = class UsersService {
    constructor(users, userActivities, authService, menusService) {
        this.users = users;
        this.userActivities = userActivities;
        this.authService = authService;
        this.menusService = menusService;
    }
    async get(type) {
        if (type) {
            return (await this.users.find({ 'settings.isDeleted': false }).populate({ path: 'roles' })).filter(d => d.roles[0].name === type);
        }
        else {
            return await this.users.find({ 'settings.isDeleted': false }).populate({ path: 'roles' });
        }
    }
    async verifyName(email) {
        return await true;
    }
    async add(userDTO) {
        userDTO.settings = { homeRoute: userDTO.homeRoute };
        if (userDTO.fullName) {
            userDTO.name = userDTO.fullName.replace(/ /g, '').toLowerCase();
        }
        if (userDTO.auth) {
            userDTO.auth = {};
        }
        userDTO.email = (userDTO.email.toLowerCase()).trim();
        userDTO.empCode = (userDTO.empCode.toLowerCase()).trim();
        return new Promise((resolve, reject) => {
            new this.users(userDTO).save(async (err, data) => {
                console.log(err, "error");
                if (err)
                    reject('REGISTRATION.ERROR.USER_NOT_SUCCESSFULLY_CREATED');
                this.authService.registeredEmails[userDTO.email] = 'offline';
                const emailVerificationToken = await this.authService.createEmailVerificationToken(userDTO.email, userDTO.password);
                if (emailVerificationToken) {
                    resolve({
                        statusCode: 201,
                        message: 'REGISTRATION.USER_REGISTERED_SUCCESSFULLY'
                    });
                }
                else {
                    reject('REGISTRATION.ERROR.MAIL_NOT_SENT');
                }
            });
        });
    }
    async updateUserRoles(name, rolesDTO) {
        const user = await this.users.findOneAndUpdate({ name, 'settings.isDeleted': false }, { $set: { roles: rolesDTO.roles } });
        return user;
    }
    async getUser(email) {
        return await await this.users.findOne({ email, 'settings.isDeleted': false }).populate({ path: 'roles' });
    }
    async updateUser(email, userDTO) {
        return await await this.users.findOneAndUpdate({ email, 'settings.isDeleted': false }, { $set: { settings: userDTO.settings, profile: userDTO.profile, experience: userDTO.experience, educations: userDTO.educations, roles: userDTO.roles } });
    }
    async getUserRole(email) {
        const user = await this.users.findOne({ email, 'settings.isDeleted': false }, { roles: 1 }).populate({ path: 'roles' });
        return user;
    }
    async getUserRoles(user) {
        let userRoles;
        if (user.email) {
            const u = (await this.users.findOne({ email: user.email, 'settings.isDeleted': false }, { roles: 1 }).populate({ path: 'roles' }));
            if (u) {
                userRoles = u.roles;
            }
        }
        else {
            const u = (await this.users.findOne({ user, 'settings.isDeleted': false }, { roles: 1 }).populate({ path: 'roles' }));
            if (u) {
                userRoles = u.roles;
            }
        }
        if (user)
            return userRoles;
        return null;
    }
    async updatePrivileges(userName, privilegesDTO) {
        return 'privileges updated';
    }
    async getPrivileges(userName) {
        return 'privileges list';
    }
    async updatePrivilegesSchedule(userName, privilegesScheduleDTO) {
        return 'privileges Schedule updated';
    }
    async updateHomeRoute(name, homeRouteDTO) {
        const user = await this.users.findOneAndUpdate({ name, 'settings.isDeleted': false }, { $set: { 'settings.homeRoute': homeRouteDTO.homeRoute } });
        return user;
    }
    async getHomeRoute(email) {
        const user = await this.users.findOne({ email, 'settings.isDeleted': false }, { 'settings.homeRoute': 1 });
        return user.settings.homeRoute;
    }
    async updateProfilePic(userName, profilePicDTO) {
        return 'PP updated';
    }
    async getProfilePic(userName) {
        return 'Profile PIC';
    }
    async updateProfile(userName, profileDTO) {
        return 'Profile Updated';
    }
    async updateFullName(userName, fullNameDTO) {
        return 'Full name updtaed';
    }
    async updateProfileName(userName, profileNameDTO) {
        return 'Profile Name updated';
    }
    async updateAddress(userName, addressDTO) {
        return 'Address Updated';
    }
    async updatePhoneNumber(userName, phoneNumberDTO) {
        return 'Phone number Updated';
    }
    async updateEmail(userName, alternetEmailDTO) {
        return 'Email updated';
    }
    async activate(email) {
        const user = await this.updateActivation(email, { isActive: true });
        return user;
    }
    async deactivate(email) {
        const user = await this.updateActivation(email, { isActive: false, });
        return user;
    }
    async updateActivation(email, activation) {
        const user = await this.users.findOneAndUpdate({ email, 'settings.isDeleted': false }, { $set: { 'settings.isActive': activation, 'status': 'offline' } });
        return user;
    }
    async toggleActivation(email) {
        const findUser = await this.users.findOne({ email, 'settings.isDeleted': false });
        const user = await this.users.findOneAndUpdate({ email, 'settings.isDeleted': false }, { $set: { 'settings.isActive': !findUser.settings.isActive, 'status': 'offline' } });
        return user;
    }
    async updateMaritalStatus(email) {
        return 'updateMaritalStatus';
    }
    async deleteUser(email) {
        const user = await this.users.findOneAndUpdate({ email }, { $set: { 'settings.isDeleted': true } });
        return user;
    }
    async isActive(email) {
        const user = await this.users.findOne({ email }, { 'settings.isActive': 1 });
        return user.settings.isActive;
    }
    async isLocked(email) {
        const user = await this.users.findOne({ email }, { 'auth.isLocked': 1 });
        return user.auth.isLocked;
    }
    async lock(email) {
        const user = await this.users.findOneAndUpdate({ email, 'settings.isDeleted': false }, { $set: { 'auth.isLocked': true } });
        return user;
    }
    async unlock(email) {
        const user = await this.users.findOneAndUpdate({ email, 'settings.isDeleted': false }, { $set: { 'auth.isLocked': false } });
        return user;
    }
    async getAuthStatus(email) {
        const status = await this.users.findOne({ email, 'settings.isDeleted': false }, { 'auth.status': 1 });
        return status;
    }
    async addActivity(email, activityDTO) {
        const user = await this.users.findOne({ email, 'settings.isDeleted': false });
        const userAcitivity = await new this.userActivities({ user: user._id, activityName: activityDTO.activityName, componentRoute: activityDTO.componentRoute, desc: activityDTO.desc }).save();
        return userAcitivity;
    }
    async getActivities(email) {
        const userActivities = await this.userActivities.findOne({ email }).populate({ path: 'user' });
        return userActivities;
    }
    async isOnline(email) {
        const user = await this.getStatus(email);
        if (user === 'offline') {
            return false;
        }
        else if (user.status === 'online') {
            return true;
        }
        else {
            return null;
        }
    }
    async getStatus(email) {
        const user = await this.users.findOne({ email }, { status: 1 });
        return user.status;
    }
    async changePassword(userName) {
        return 'changePassword';
    }
    async setPassword(email, newPassword) {
        const userFromDb = await this.users.findOne({ email });
        if (!userFromDb) {
            throw new common_1.HttpException('LOGIN.USER_NOT_FOUND', common_1.HttpStatus.NOT_FOUND);
        }
        userFromDb.password = await bcrypt.hash(newPassword, 10);
        await userFromDb.save();
        return true;
    }
    async getUsers() {
        return await this.users.find().populate({ path: 'roles' });
    }
    async addUser(userDto) {
        return await new this.users(userDto).save();
    }
    async updatePhoto(name, resp) {
        const photoUrl = '/api/v2/users/' + name + '/photo';
        const user = await this.users.findOneAndUpdate({ name }, { $set: { 'profile.picture': photoUrl, 'profile.image': resp } });
        return user;
    }
    async updateRoles(name, resp) {
        const user = await this.users.findOneAndUpdate({ name }, { $set: { roles: resp.roles } });
        return user;
    }
    async changeUserActivation(name, resp) {
        const user = await this.users.findOneAndUpdate({ name }, { $set: { 'settings.isActive': resp.isActive } });
        return user;
    }
    async getUserPhoto(email) {
        const user = await this.users.findOne({ email }, { 'profile.image.filename': 1 });
        return user.profile.image.filename;
    }
    async getAccessRoutes(email) {
        const routes = [];
        const menus = await this.menusService.get();
        console.log(email, menus);
        if (superAdmins.includes(email)) {
            menus.forEach(menu => {
                routes.push(menu.route.link);
            });
            return routes;
        }
        const userRoles = (await this.getUserRoles({ email }));
        if (userRoles) {
            if (userRoles.length > 0) {
                userRoles.forEach(role => {
                    for (const route in role.privileges.menus) {
                        menus.forEach(menu => {
                            if (route === menu.route.name) {
                                routes.push(menu.route.link);
                            }
                        });
                    }
                });
            }
            else {
                menus.forEach(menu => {
                    routes.push(menu.route.link);
                });
            }
            return routes;
        }
        else {
            throw 'invalid user';
        }
    }
};
UsersService = __decorate([
    common_1.Injectable(),
    __param(0, mongoose_2.InjectModel('User')),
    __param(1, mongoose_2.InjectModel('User-Activity')),
    __metadata("design:paramtypes", [mongoose_1.Model,
        mongoose_1.Model,
        auth_service_1.AuthService,
        menus_service_1.MenusService])
], UsersService);
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map
import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Req, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users — Crear usuario (admin)
  @UseGuards(JwtAuthGuard)
  @Post('users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users — Listar todos los usuarios
  @UseGuards(JwtAuthGuard)
  @Get('users')
  findAll() {
    return this.usersService.findAll();
  }

  // PATCH /users/profile — Editar perfil propio
  @UseGuards(JwtAuthGuard)
  @Patch('users/profile')
  updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  // PATCH /users/:id — Editar cualquier usuario (admin)
  @UseGuards(JwtAuthGuard)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // DELETE /users/:id — Eliminar un usuario
  @UseGuards(JwtAuthGuard)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  // GET /permissions — Permisos del usuario logueado
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  getPermissions(@Req() req) {
    const userId = req.user.id;
    return this.usersService.getPermissions(userId);
  }
}

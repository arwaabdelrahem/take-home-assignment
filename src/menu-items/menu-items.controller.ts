import { Controller, Post } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}
}

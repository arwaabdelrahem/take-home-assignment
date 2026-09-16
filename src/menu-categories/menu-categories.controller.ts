import { Controller, Post } from '@nestjs/common';
import { MenuCategoriesService } from './menu-categories.service';

@Controller('menu-categories')
export class MenuCategoriesController {
  constructor(private readonly menuCategoriesService: MenuCategoriesService) {}
}

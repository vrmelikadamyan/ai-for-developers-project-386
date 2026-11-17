package io.hexlet.calendar.system;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
class FrontendRoutes implements WebMvcConfigurer {
  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    for (String path : List.of("/book", "/owner/meeting-types", "/owner/bookings/upcoming")) {
      registry.addViewController(path).setViewName("forward:/index.html");
    }
  }
}

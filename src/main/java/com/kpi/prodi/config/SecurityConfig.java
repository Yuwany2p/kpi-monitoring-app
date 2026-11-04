package com.kpi.prodi.config;

import com.kpi.prodi.security.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    public SecurityConfig(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authenticationProvider(authenticationProvider())
            .authorizeHttpRequests(auth -> auth
                // Static resources & public endpoints
                .requestMatchers(
                    "/assets/**",
                    "/css/**",
                    "/js/**",
                    "/images/**",
                    "/libs/**",
                    "/login",
                    "/error",
                    "/h2-console/**"
                ).permitAll()
                
                // Data Karyawan: KAPROD only
                .requestMatchers("/karyawan/**").hasRole("KAPROD")

                // KPI Header management: KAPROD creates/edits/deletes/status
                .requestMatchers(
                    "/kpi/create",
                    "/kpi/edit/**",
                    "/kpi/delete/**",
                    "/kpi/status/**"
                ).hasRole("KAPROD")
                .requestMatchers("/kpi/**").authenticated()

                // Detail Activity: created by SEKPROD & KAUPT
                .requestMatchers(
                    "/activity/create/**",
                    "/activity/edit/**",
                    "/activity/delete/**"
                ).hasAnyRole("SEKPROD", "KAUPT")

                // Activity Picking & Progress upload: PIC_ACTIVITY
                .requestMatchers(
                    "/activity/pick/**",
                    "/activity/my-activities",
                    "/progress/**"
                ).hasRole("PIC_ACTIVITY")

                // Approval Level 1: SEKPROD & KAUPT
                .requestMatchers("/approval/l1/**").hasAnyRole("SEKPROD", "KAUPT")

                // Approval Final: KAPROD
                .requestMatchers("/approval/final/**").hasRole("KAPROD")

                // Dashboard and General Authenticated Pages
                .requestMatchers("/dashboard", "/files/**").authenticated()

                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .defaultSuccessUrl("/dashboard", true)
                .failureUrl("/login?error=true")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutRequestMatcher(new AntPathRequestMatcher("/logout"))
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .exceptionHandling(ex -> ex
                .accessDeniedPage("/error/403")
            )
            // Allow frames for H2 console if profile is active
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**"));

        return http.build();
    }
}


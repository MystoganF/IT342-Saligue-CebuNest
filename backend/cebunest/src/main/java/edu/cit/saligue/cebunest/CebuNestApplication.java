package edu.cit.saligue.cebunest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CebuNestApplication {

	public static void main(String[] args) {
		SpringApplication.run(CebuNestApplication.class, args);
	}

}
